"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const upath = require("upath");
const fe = require("file-exists");
const treekill = require("tree-kill");
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
	} catch {}
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

	let opts = ["--config", config];
	if (!dry) opts.push("--write");
	// [https://prettier.io/docs/en/cli.html#--ignore-path]
	// [https://prettier.io/docs/en/ignore.html#ignoring-files]
	// [https://github.com/prettier/prettier/issues/3460]
	if (ignore) opts.push("--ignore-path", ignore);
	opts.push(filepath); // "--loglevel", // "silent",
	return spawn(pbin, opts, options);
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

module.exports = { child, kill, ignore };
