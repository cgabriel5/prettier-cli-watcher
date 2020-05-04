"use strict";

const os = require("os");
const path = require("path");
const chalk = require("chalk");
const fe = require("file-exists");
const ext = require("file-extension");
const de = require("directory-exists");
const spawn = require("cross-spawn-with-kill");

/**
 * Get file path information (i.e. file name and directory path).
 *
 * @param  {string} filepath - The complete file path.
 * @return {object} - Object containing file path components.
 */
let fileinfo = (filepath) => ({
	name: path.basename(filepath),
	dirname: path.dirname(filepath),
	ext: ext(filepath),
	path: filepath
});

/**
 * Checks whether the file's extension is allowed.
 *
 * @param  {array} exts - List of allowed extensions.
 * @param  {string} file_extension - The file's extension.
 * @param  {boolean} nolog - Flag indicating whether to log warning or not.
 * @param  {string} line_sep - Logging line decoration.
 * @param  {string} custom_filepath - The custom file path to log.
 * @return {boolean} - Boolean indicating whether extension is allowed.
 */
let unallowed_ext = (
	exts,
	file_extension,
	nolog,
	line_sep,
	custom_filepath
) => {
	// Filter files not of allowed extensions.
	if (!exts.includes(file_extension) && !nolog) {
		if (!nolog) console.log(`${line_sep}\n[skipped]`, custom_filepath);
		return false; // Return from onChange handler.
	}
	return true; // File's extension is allowed.
};

/**
 * Create the prettier process on file.
 *
 * @param  {string} filepath - The modified file's path.
 * @param  {string} tmp_filepath - Temporary file path of the prettier config.
 * @return {object} - The spawned child process.
 */
let child_process = (filepath, tmp_filepath) => {
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

	if (!pbin) {
		console.log(
			`[${chalk.red("error")}] Could not find local ./${chalk.bold(
				binpath
			)}.`
		);
		process.exit();
	}

	return spawn(
		pbin,
		[
			"--config",
			tmp_filepath,
			// "--loglevel",
			// "silent",
			"--write",
			filepath
		],
		options
	);
};

/**
 * Quick file change deflection logic (deflects rapid changes made to file).
 *
 * @param  {object} lookup - The lookup db object.
 * @param  {string} filepath - The file path of the modified file.
 * @param  {object} stats - The file stats object.
 * @param  {boolean} deflected - Boolean indicating whether last change
 *     event was deflected.
 * @param  {number} dtime - The time that must pass to not perceive
 *     change event as a rapid/quick change.
 * @return {boolean} - Boolean indicating whether change event should be
 *     deflected.
 */
let deflect = (lookup, filepath, stats, deflected, dtime, handler) => {
	// dtime value of 0 skips deflection logic check.
	if (!dtime) return false;

	// Get last recorded change on the modified file.
	let last_change = lookup.changes[filepath];
	let mtime = stats.mtime.getTime();
	// If a last recorded time and it is not a quick deflection...
	if (last_change && !deflected) {
		// Calculate difference between last recorded and file modified time.
		let last_change_time_diff = mtime - last_change;
		// If the time difference is less than allowed deflect time the
		// change was performed to close to the last change to clear
		// the last set timeout.
		if (last_change_time_diff < dtime) {
			if (lookup.timeouts[filepath]) {
				clearTimeout(lookup.timeouts[filepath]);
				delete lookup.timeouts[filepath];
			}
			// If the time difference is negative don't create new timeout.
			if (last_change_time_diff >= 0) {
				lookup.timeouts[filepath] = setTimeout(function () {
					handler(filepath, stats, true /*← quick deflect flag*/);
				}, 150);
			}

			return true;
		}
	}

	return false;
};

/**
 * Kills the currently running/active process on the file.
 *
 * @param  {object} lookup - The lookup db object.
 * @param  {string} filepath - The file path of the modified file.
 * @return {undefined} - Nothing is returned.
 */
let kill = (lookup, filepath) => {
	// Look for a running process on the file.
	let __active_process__ = lookup.processes[filepath];
	// Kill if active and not already completed.
	if (__active_process__ && !__active_process__.__completed__) {
		__active_process__.__killed_off__ = true;
		__active_process__.kill();
	}
};

module.exports = { fileinfo, child_process, deflect, kill, unallowed_ext };
