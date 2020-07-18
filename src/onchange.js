"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const upath = require("upath");
const flatry = require("flatry");
const fe = require("file-exists");
const treekill = require("tree-kill");
const { lstats } = require("./filesystem.js");
const { error, system } = require("./utils.js");
const spawn = require("cross-spawn-with-kill");

/**
 * Determines whether path should be ignored.
 *
 * @param  {string} p - File path.
 * @param  {array} ig - The nodeignore "ignore" object.
 * @return {boolean} - Boolean indicating whether to ignore or not.
 */
let ignore = (p, ig) => {
	if (system.windows) p = upath.normalizeSafe(p);
	let file = path.relative(process.cwd(), p);
	if (system.windows) file = upath.normalizeSafe(file);
	let res = false;

	// Try/catch in case file was deleted.
	try {
		if (fs.statSync(p).isDirectory() && !file.endsWith("/")) file += "/";
		let test = ig.ignores(file);
		if (test && !ignore.lookup[file]) ignore.lookup[file] = true;
		res = test;
	} catch {
		/*empty*/
	}
	return res;
};
// Async version of function for hound.
ignore.async = async (p, ig) => {
	if (system.windows) p = upath.normalizeSafe(p);
	let file = path.relative(process.cwd(), p);
	if (system.windows) file = upath.normalizeSafe(file);
	let res = false;

	// Try/catch in case file was deleted.
	try {
		let [, stats] = await flatry(lstats(p));
		if (stats.is.directory && !file.endsWith("/")) file += "/";
		let test = ig.ignores(file);
		if (test && !ignore.lookup[file]) ignore.lookup[file] = true;
		res = test;
	} catch {
		/*empty*/
	}
	return res;
};
ignore.lookup = {}; // Track ignored files.

/**
 * Create the prettier process on file.
 *
 * @param  {string} filepath - File path.
 * @param  {boolean} dry - Save formatted contents or not.
 * @param  {string} config - Path to temporary prettier config file.
 * @param  {string} ignore - Path to temporary ignore file.
 * @return {object} - The spawned child process.
 */
let child = (filepath, dry, config, ignore) => {
	// [https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options]
	let options = { stdio: "pipe" };

	// For Linux only force terminal output to maintain colors. Adding this
	// to macOS for example causes it to choke and not run. Giving the error:
	// "env: node: No such file or directory".
	// [https://nodejs.org/api/os.html#os_os_platform]
	// Preserve terminal colors: [https://stackoverflow.com/a/43375301]
	if (os.platform() === "linux") options.env = { FORCE_COLOR: true };

	// Traverse parent dirs to find prettier binary.
	let pbin = "";
	let dirs = process.cwd();
	const binpath = "node_modules/prettier/bin-prettier.js";
	while (dirs !== "/") {
		if (fe.sync(path.join(dirs, binpath))) {
			pbin = path.join(dirs, binpath);
			break;
		}
		dirs = path.dirname(dirs);
	}

	if (!pbin) error(`Could not find local ./${binpath}.`);

	let args = [];
	// Maintain prettier output colors for errors.
	// [https://github.com/Marak/colors.js/issues/127]
	// [https://github.com/Marak/colors.js#enablingdisabling-colors]
	// [https://stackoverflow.com/a/9137636]
	args.push("--colors", "always");
	args.push("--config", config);
	if (!dry) args.push("--write");
	// [https://prettier.io/docs/en/cli.html#--ignore-path]
	// [https://prettier.io/docs/en/ignore.html#ignoring-files]
	// [https://github.com/prettier/prettier/issues/3460]
	if (ignore) args.push("--ignore-path", ignore);

	args.push(filepath); // "--loglevel", // "silent",
	return spawn(pbin, args, options);
};

/**
 * Kills file's running/active processes.
 *
 * @param  {object} lookup - The lookup db object.
 * @param  {string} file - File path.
 * @return {undefined} - Nothing is returned.
 */
let kill = (lookup, file) => {
	if (!lookup.processes[file]) return;
	let procs = lookup.processes[file];
	for (let i = 0, l = procs.length; i < l; i++) {
		let proc = procs[i];
		// [https://stackoverflow.com/a/42545818]
		// [https://stackoverflow.com/a/21296291]
		treekill(proc.pid, "SIGKILL");
		proc.__SIGKILL = true;
	}
	delete lookup.processes[file];
};

/**
 * Rapid file change deflection logic.
 *
 * @param  {object} lookup - The lookup db object.
 * @param  {string} file - File path.
 * @param  {object} stats - File stats object.
 * @param  {boolean} deflected - Was last change event deflected?
 * @param  {number} dtime - Time (ms) used to deflect rapid changes.
 * @return {boolean} - Indicates if change event should be deflected.
 */
let deflect = (lookup, file, stats, deflected, dtime, handler) => {
	kill(lookup, file);

	if (!dtime) {
		return;
	}
	let ltime = lookup.changes[file];
	let mtime = stats.mtime.getTime();
	if (ltime && !deflected) {
		let delta = mtime - ltime;
		if (delta < dtime) {
			if (lookup.timeouts[file]) {
				clearTimeout(lookup.timeouts[file]);
				delete lookup.timeouts[file];
			}
			if (delta >= 0) {
				let timeout = setTimeout(() => handler(file, stats, true), 150);
				lookup.timeouts[file] = timeout;
			}
			return true;
		}
	}
};

module.exports = { child, ignore, deflect };
