#!/usr/bin/env node
"use strict";

// Get CLI parameters.
const {
	dir,
	// configpath,
	ignoredirs,
	exts,
	nonotify,
	nolog,
	tmps,
	watcher_name,
	dtime
} = require("./params.js")();

// Needed modules.
const os = require("os");
const path = require("path");
const chalk = require("chalk");
const slash = require("slash");
const notifier = require("node-notifier");

// Get system/platform information.
const platform = os.platform();
const system = {
	platform,
	is_macos: platform === "darwin",
	is_windows: platform === "win32"
};

// Get change event utils.
const {
	fileinfo,
	child_process,
	kill_active_process,
	quick_deflect,
	is_allowed_file_extension
} = require("./onchange.utils.js");

// Keep track of active prettified files.
const lookup = {
	processes: {},
	errors: {},
	changes: {},
	timeouts: {}
};
const line_sep = "-".repeat("60");

/**
 * Watcher handler function. Main logic of watcher.
 *
 * @param  {string} filepath - Filepath of modified file.
 * @param  {object} stats - Modified file's stats.
 * @param  {boolean} deflected - Boolean indicating whether last change was
 *     deflected due to quick file changes.
 * @return {undefined} - Nothing is returned.
 */
let handler = (filepath, stats, deflected) => {
	// Store original file path.
	let orig_filepath = filepath;

	// Note: Convert Windows file slahses.
	if (system.is_windows) {
		filepath = slash(filepath);
	}

	// Prefix filepath with ./ if not already.
	if (!filepath.startsWith("./")) {
		filepath = `./${filepath}`;
	}

	// Check for an active prettier process on the file. If one exists
	// kill it to start a new one. Kinda like the setTimeout/clearTimeout
	// logic. This is done as the file was saved again before the current
	// prettier process could finish. Therefore, the old process is killed
	// and to then start a new one.
	kill_active_process(lookup, filepath);

	// If many changes are made to the file in rapid succession deflect all
	// of them and use a set timeout to only run on last change.
	if (quick_deflect(lookup, filepath, stats, deflected, dtime, handler)) {
		return;
	}

	// Get the file path information (name, dirname, etc.).
	let {
		ext: file_extension,
		name: filename,
		dirname: filedirname
	} = fileinfo(filepath);
	let custom_filepath = `${filedirname}/${chalk.bold(filename)}`;

	// File needs to be of the allowed file extensions.
	if (
		!is_allowed_file_extension(
			exts,
			file_extension,
			nolog,
			line_sep,
			custom_filepath
		)
	) {
		return;
	}

	// Stop listening to file changes while formatting file. [not needed?]
	// -→ watcher.unwatch(filepath);

	// Get prettier config temp file (check for extension specific config).
	// [https://eslint.org/docs/rules/no-prototype-builtins]
	let tmp_filepath = Object.prototype.hasOwnProperty.call(
		tmps,
		file_extension
	)
		? tmps[file_extension]
		: tmps["*"];

	// Get what prettier config was used on the file.
	let pconfig = `${
		tmps.__multi__
			? ` ${
					tmp_filepath.includes("*-")
						? "*"
						: tmp_filepath.match(/(?!\/)[a-z0-9]+(?=-)/)[0]
			  }`
			: ""
	}`;

	// If using a multi-config indicator reset the value due to Windows issue.
	// Check note in params.js.
	if (pconfig.trim() === "all") {
		pconfig = " *";
	}

	// Create the child process.
	const cprocess = child_process(filepath, tmp_filepath);
	// Store process reference.
	lookup.processes[filepath] = cprocess;

	// Cache child spawn output.
	let res = "";
	// Child spawn error status flag.
	let errored = true;

	// -- Process Events --//

	cprocess.stdout.on("data", data => {
		// Capture output for later use.
		res = data;
		// Reset flag.
		errored = false;
	});
	cprocess.stderr.on("data", data => {
		// Capture output for later use.
		res = data;
		// Reset flag.
		errored = true;
	});

	cprocess.on("close", () => {
		// Update the last change time.
		lookup.changes[filepath] = Date.now();

		// If the process was killed manually do not continue with
		// logging/notification logic.
		if (cprocess.__killed_off__) {
			return;
		} else {
			// Set a custom property denote process completed.
			cprocess.__completed__ = true;

			// With process completed do some cleanup.
			delete lookup.processes[filepath];
		}

		// Re-watch file. [not needed?]
		// -→ watcher.add(filepath);

		// Stringify and cleanup response.
		let response = res.toString().trim();

		// Log message to print.
		let message;

		if (errored) {
			// Get line information.
			let lineinfo = (response.match(/(?! )\((\d+:\d+)\)$/m) || [""])[0];

			// Check if previous error exists.
			let last_error = lookup.errors[filepath];
			if (last_error) {
				// Compare current error with last error information.
				// If the information is the same skip log/notification.
				if (
					last_error.response === response &&
					last_error.lineinfo === lineinfo &&
					// Deflect "quick saves" (i.e. pressing [Super/CTRL]+s
					// in rapid succession.) if same error.
					Date.now() - last_error.time <= 2000
				) {
					// Update the time.
					last_error.time = Date.now();

					return;
				}
			}

			// Store error information.
			lookup.errors[filepath] = { response, lineinfo, time: Date.now() };

			// Cleanup original path.
			orig_filepath = orig_filepath.replace(/^\.\//, "");
			// Prep dynamic RegExp for Windows.
			if (system.is_windows) {
				// Add extra forward slahes so dynamic RegExp works on Windows.
				orig_filepath = orig_filepath.replace(/\\/g, "\\\\");
			}

			// Create error message.
			message = `${response
				// Replace old file path with custom file path and
				// red highlighted line numbers.
				.replace(
					new RegExp(`(\\.\\/)?${orig_filepath}:`),
					`⛔ ${custom_filepath}:${chalk.bold.red(
						lineinfo.replace(/\(|\)/g, "")
					)} —`
				)
				.replace(/error/, `error${chalk(pconfig)}`)
				// Remove original line information.
				.replace(lineinfo, "")}`;

			// Highlight error decorations for the following platforms.
			if (system.is_windows || system.is_macos) {
				message = message.replace(
					/^\[error/gm,
					`[${chalk.red("error")}`
				);
			}

			// Send OS notification that prettier failed.
			if (!nonotify) {
				// Notification options.
				let noptions = {
					title: "prettier-cli-watcher",
					message: `${filepath} format failed. ${lineinfo}`,
					// [https://www.flaticon.com/free-icon/warning_196759#term=error&page=1&position=16]
					icon: path.join(__dirname, "/assets/img/warning.png")
				};
				// Add close action button for macOS.
				if (system.is_macos) {
					noptions.actions = "Close";
				}

				// Send notification.
				notifier.notify(noptions);
			}
		} else {
			// Remove error information.
			delete lookup.errors[filepath];

			// Get the prettier duration from original output.
			let duration = (response.match(/(?! )(\d+)(\w+)$/) || [""])[0];
			// Create success message.
			message = `[${chalk.cyan(
				"prettied"
			)}${pconfig}] 😎 ${custom_filepath} ${duration}`;
		}

		// Log success/error message.
		if (message && !nolog) {
			console.log(`${line_sep}\n${message}`);
		}
	});
};

// Get file watcher and only react to file modifications.
require("./watcher.js")(dir, watcher_name, ignoredirs, system).on(
	"change",
	handler
);
