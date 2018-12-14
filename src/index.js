#!/usr/bin/env node
"use strict";

// Needed modules.
const path = require("path");
const chalk = require("chalk");
const chokidar = require("chokidar");
const minimist = require("minimist");
const notifier = require("node-notifier");
const escapereg = require("lodash.escaperegexp");
require("./cleanup.js")();

// Get CLI parameters.
const params = require("./params.js")();
const dir = params.dir;
const configpath = params.configpath;
const ignoredirs = params.ignoredirs;
const exts = params.exts;
const nonotify = params.nonotify;
const nolog = params.nolog;

// Get change event utils.
const {
	fileinfo,
	child_process,
	kill_active_process,
	is_allowed_file_extension
} = require("./onchange.utils.js");

// Keep track of active prettified files.
const lookup = {
	processes: {},
	errors: {}
};
const line_sep = "-".repeat("60");

// Initialize watcher.
var watcher = chokidar.watch(dir, {
	persistent: true,
	ignoreInitial: true,
	ignored: filepath => {
		// Ignore paths containing following folders.
		return ignoredirs.test(filepath);
	}
});

// Only react to file modifications.
watcher.on("change", (filepath, stats) => {
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

	// Create the child process.
	const cprocess = child_process(filepath);
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
			let lineinfo = (response.match(/(?! )\((\d+\:\d+)\)$/m) || [""])[0];

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
			// Create error message.

			message = `${response
				// Replace old file path with custom file path and
				// red highlighted line numbers.
				.replace(
					new RegExp(`(\\.\\/)?${filepath.replace(/^\.\//, "")}:`),
					`⛔ ${custom_filepath}:${chalk.bold.red(
						lineinfo.replace(/\(|\)/g, "")
					)} —`
				)
				// Remove original line information.
				.replace(lineinfo, "")}`;

			// Send OS notification that prettier failed.
			if (!nonotify) {
				notifier.notify({
					title: "prettier-cli-watcher",
					message: `${filepath} format failed. ${lineinfo}`,
					// [https://www.flaticon.com/free-icon/warning_196759#term=error&page=1&position=16]
					icon: path.join(__dirname, "/assets/img/warning.png")
				});
			}
		} else {
			// Remove error information.
			delete lookup.errors[filepath];

			// Get the prettier duration from original output.
			let duration = (response.match(/(?! )(\d+)(\w+)$/) || [""])[0];
			// Create success message.
			message = `[${chalk.cyan(
				"prettied"
			)}] 😎 ${custom_filepath} ${duration}`;
		}

		// Log success/error message.
		if (message && !nolog) {
			console.log(`${line_sep}\n${message}`);
		}
	});
});
