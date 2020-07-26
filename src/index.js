#!/usr/bin/env node

"use strict";

const path = require("path");
const chalk = require("chalk");
const slash = require("slash");
const notifier = require("node-notifier");

const params = require("./params.js")();
const { dir, dry, notify, log, tconfig } = params;
const { tignore, watcher, globs, dtime } = params;
const { child, deflect } = require("./onchange.js");
const { sep, error, system } = require("./utils.js");
const lookup = { processes: {}, errors: {}, changes: {}, timeouts: {} };

/**
 * Watcher handler.
 *
 * @param  {string} file - File path.
 * @param  {object} stats - File's stats object.
 * @return {undefined} - Nothing is returned.
 */
let handler = (file, stats, deflected) => {
	let cwd = process.cwd();
	if (system.win) file = slash(file);

	if (deflect(lookup, file, stats, deflected, dtime, handler)) return;

	const proc = child(file, dry, tconfig, tignore);
	if (!lookup.processes[file]) lookup.processes[file] = [];
	lookup.processes[file].push(proc);

	let res = "";
	let err = true;
	proc.stdout.on("data", (data) => {
		res = data;
		err = false;
	});
	proc.stderr.on("data", (data) => {
		res = data;
		err = true;
	});
	// [https://stackoverflow.com/a/17749844]
	proc.on("error", () => {
		error("Failed to run prettier.");
	});
	// [https://link.medium.com/MYwtjYvag6]
	proc.on("close", (code, signal) => {
		lookup.changes[file] = Date.now();
		if (signal === "SIGKILL" || proc.__SIGKILL) return;
		delete lookup.processes[file];

		let msg = res.toString().trim();
		if (err) {
			// Ignore: "No files matching the pattern were found" errors.
			if (msg.includes("matching the pattern were found")) return;

			let noparser = msg.includes("No parser could be inferred");
			let lineinfo = (msg.match(/(?! )\((\d+:\d+)\)$/m) || [""])[0];
			let time = Date.now();

			let last_error = lookup.errors[file];
			if (last_error) {
				let check1 = last_error.msg === msg;
				let check2 = lineinfo && last_error.lineinfo === lineinfo;
				let check3 = time - last_error.time <= 2000;
				if (check1 && check2 && check3) {
					last_error.time = time;
					return;
				}
			}

			// Skip sequential no parser errors.
			if (noparser) {
				if (last_error) return;
				let file = msg.split(": ", 2)[1];
				let header = `[${chalk.cyan("ignored")}]`;
				msg = `${header} No parser inferred: ${file}`;
			}

			lookup.errors[file] = { msg, lineinfo, time };

			if (notify && !noparser) {
				let noptions = {
					title: "Error (prettier-cli-watcher)",
					message: `${path.relative(cwd, file)} ${lineinfo}`,
					icon: path.join(__dirname, "/assets/img/warning.png")
				};
				if (system.mac) noptions.actions = "Close";
				notifier.notify(noptions);
			}
		} else {
			delete lookup.errors[file];
			let duration = (msg.match(/(?! )(\d+)(\w+)$/) || [""])[0];
			file = path.relative(cwd, file);
			msg = `[${chalk.green("prettied")}] ${file} ${duration}`;
		}

		if (msg && !log) console.log(`${sep}\n${msg}`);
	});
};

require("./watcher.js")(dir, watcher, globs).on("change", handler);
