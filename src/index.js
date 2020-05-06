#!/usr/bin/env node

"use strict";

const fs = require("fs");
const glob = require("glob");
const path = require("path");
const chalk = require("chalk");
const slash = require("slash");
const notifier = require("node-notifier");

const params = require("./params.js")();
const { dir, notify, log, config, ignore, watcher, globs } = params;
const { tildelize, system } = require("./utils.js");
const { child, kill } = require("./onchange.utils.js");

const sep = "-".repeat("60");
const lookup = { processes: {}, errors: {}, timeouts: {} };

/**
 * Watcher handler.
 *
 * @param  {string} file - Modified file path.
 * @param  {object} stats - Modified file's stats.
 * @return {undefined} - Nothing is returned.
 */
let handler = (file, stats) => {
	if (system.win) file = slash(file);

	kill(lookup, file);

	const proc = child(file, config, ignore);
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
	proc.on("error", (data) => {
		console.log(`[${chalk.red("error")}] Failed to run prettier.`);
		process.exit();
	});
	// [https://link.medium.com/MYwtjYvag6]
	proc.on("close", (code, signal) => {
		if (signal === "SIGKILL" || proc.__SIGKILL) return;
		delete lookup.processes[file];

		let msg = res.toString().trim();
		if (err) {
			let lineinfo = (msg.match(/(?! )\((\d+:\d+)\)$/m) || [""])[0];
			let time = Date.now();

			let last_error = lookup.errors[file];
			if (last_error) {
				// If last error and current error match return.
				if (last_error.msg === msg && time - last_error.time <= 2000) {
					last_error.time = time;
					return;
				}
			}

			lookup.errors[file] = { msg, time };

			if (notify) {
				let noptions = {
					title: "prettier-cli-watcher",
					msg: `${tildelize(file)} format failed. ${lineinfo}`,
					icon: path.join(__dirname, "/assets/img/warning.png")
				};
				if (system.mac) noptions.actions = "Close";
				notifier.notify(noptions);
			}
		} else {
			delete lookup.errors[file];
			let duration = (msg.match(/(?! )(\d+)(\w+)$/) || [""])[0];
			file = path.relative(process.cwd(), file);
			msg = `[${chalk.green("prettied")}] ${file} ${duration}`;
		}

		if (msg && !log) console.log(`${sep}\n${msg}`);
	});
};

require("./watcher.js")(dir, watcher, globs).on("change", handler);
