"use strict";

// Needed modules.
const os = require("os");
const path = require("path");
const chalk = require("chalk");
const ext = require("file-extension");
const spawn = require("cross-spawn-with-kill");

/**
 * Get file path information (i.e. file name and directory path).
 *
 * @param  {string} filepath - The complete file path.
 * @return {object} - Object containing file path components.
 */
let fileinfo = filepath => {
	// Get file extension.
	let extension = ext(filepath);
	// Get file name and directory path.
	let name = path.basename(filepath);
	let dirname = path.dirname(filepath);

	return {
		name,
		dirname,
		ext: extension,
		path: filepath
	};
};

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
let is_allowed_file_extension = (
	exts,
	file_extension,
	nolog,
	line_sep,
	custom_filepath
) => {
	// Filter files not of allowed extensions.
	if (!exts.includes(file_extension) && !nolog) {
		if (!nolog) {
			console.log(
				`${line_sep}
[${chalk.yellow("warn")}]`,
				custom_filepath,
				"- disallowed extension.",
				`\n[${chalk.yellow("warn")}] ${file_extension} ${chalk.bold(
					"NOT IN"
				)} allowed extensions:\n[${chalk.yellow("warn")}] ${exts.join(
					"|"
				)}`
			);
		}

		// Return from onChange handelr.
		return false;
	}

	// File's extension is allowed.
	return true;
};

/**
 * Create the prettier process on file.
 *
 * @param  {string} filepath - The modified file's path.
 * @param  {string} tmp_filepath - Temporary file path of the prettier config.
 * @return {object} - The spawned child process.
 */
let child_process = (filepath, tmp_filepath) => {
	// Child spawn options.
	// [https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options]
	let options = {
		stdio: "pipe"
	};

	// For Linux only force terminal output to maintain colors. Adding this
	// to macOS for example causes it to choke and not run. To be specific,
	// I get this error on macOS when the env option is supplied:
	// "env: node: No such file or directory".
	// [https://nodejs.org/api/os.html#os_os_platform]
	if (os.platform() === "linux") {
		options.env = {
			// Preserve terminal colors:
			// [https://stackoverflow.com/a/43375301]
			FORCE_COLOR: true
		};
	}

	// Run prettier on file.
	return spawn(
		"./node_modules/prettier/bin-prettier.js",
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
let quick_deflect = (lookup, filepath, stats, deflected, dtime, handler) => {
	// Note: A dtime value of 0 skips deflection logic check.
	if (!dtime) {
		return false;
	}

	// Get last recorded change on the modified file.
	let last_change = lookup.changes[filepath];
	// Get file's modified time.
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
				lookup.timeouts[filepath] = setTimeout(function() {
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
let kill_active_process = (lookup, filepath) => {
	// Look for a running process on the file.
	let __active_process__ = lookup.processes[filepath];

	// Only kill process if still active AND not already completed.
	if (__active_process__ && !__active_process__.__completed__) {
		// Attach custom property for later use.
		__active_process__.__killed_off__ = true;
		// Finally, kill process.
		__active_process__.kill();
	}
};

module.exports = {
	fileinfo,
	child_process,
	quick_deflect,
	kill_active_process,
	is_allowed_file_extension
};
