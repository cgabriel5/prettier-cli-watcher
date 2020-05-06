"use strict";

const fs = require("fs");
const path = require("path");
const temp = require("temp");
const toml = require("toml");
const chalk = require("chalk");
const log = require("fancy-log");
const fe = require("file-exists");
const minimist = require("minimist");
const de = require("directory-exists");
const parseignore = require("parse-gitignore");
const { cosmiconfigSync } = require("cosmiconfig");
const { sep, error, relativize, tildelize } = require("./utils.js");

module.exports = function () {
	const params = minimist(process.argv.slice(2));

	let cwd = process.cwd();
	let dir = params.dir || cwd;
	if (dir && dir === true) dir = cwd;
	if (dir === "." || dir === "./") dir = cwd;
	if (dir.endsWith("/")) dir = dir.slice(0, -1);

	let globs = [];
	const app = "prettier";
	let configpath = params.config || "";
	let ignorepath = params.ignore || "";

	const setup = params.setup;
	const log = params.quiet || false;
	const notify = params.notify || false;
	let watcher = params.watcher || "chokidar";

	if (!path.isAbsolute(dir)) dir = path.resolve(dir);
	if (!de.sync(dir)) error(`--dir ${dir} doesn't exist.`);
	if (!["chokidar", "hound"].includes(watcher)) watcher = "chokidar";

	let res = {};
	if (configpath) {
		if (!path.isAbsolute(configpath)) configpath = path.resolve(configpath);
		const explorer = cosmiconfigSync(app);
		try {
			res = explorer.load(configpath);
		} catch (err) {
			let issue = "parse config";
			if (err.syscall && err.syscall === "open") issue = "find config";
			error(`Couldn't ${issue}: ${configpath}.`);
		}
	} else {
		const explorer = cosmiconfigSync(app, {
			searchPlaces: [
				"package.json",
				`.${app}rc`,
				`configs/.${app}rc`,
				`.${app}rc.json`,
				`configs/.${app}rc.json`,
				`.${app}rc.yaml`,
				`configs/.${app}rc.yaml`,
				`.${app}rc.yml`,
				`configs/.${app}rc.yml`,
				`.${app}rc.js`,
				`configs/.${app}rc.js`,
				`${app}.config.js`,
				`configs/${app}.config.json`,
				`configs/${app}.config.js`,
				`.${app}rc.toml`,
				`configs/.${app}rc.toml`
			],
			loaders: {
				".toml": function (filepath, content) {
					try {
						return toml.parse(content);
					} catch (e) {
						let msg = "TOML parsing error:";
						let line = `${e.line}:${e.column}`;
						error(`${msg} ${line} ${e.message}`);
					}
				}
			}
		});
		explorer.clearCaches();
		res = explorer.search() || { config: {}, isEmpty: true, filepath: "" };
	}
	let config = res.config;
	configpath = res.filepath;

	let tignore = "";
	let ignorecontents = "";
	if (ignorepath) {
		if (!path.isAbsolute(ignorepath)) ignorepath = path.resolve(ignorepath);
		if (!fe.sync(ignorepath)) error(`Couldn't open: ${ignorepath}.`);
		ignorecontents = fs.readFileSync(ignorepath, "utf8");
	} else {
		const exp = cosmiconfigSync(app, {
			searchPlaces: [`.${app}ignore`, `configs/${app}ignore`],
			loaders: { noExt: (filepath, content) => content }
		});
		exp.clearCaches();
		let res = exp.search() || { config: "", isEmpty: true, filepath: "" };
		ignorecontents = res.config;
		ignorepath = res.filepath;
	}

	temp.track();
	let tconfig = temp.openSync({ prefix: `pcw.conf-`, suffix: ".json" }).path;
	fs.writeFileSync(tconfig, JSON.stringify(config, null, 2), "utf8");

	if (ignorepath) {
		tignore = temp.openSync({ prefix: `pcw.ig-`, suffix: ".ignore" }).path;
		fs.writeFileSync(tignore, ignorecontents, "utf8");
		globs = parseignore(ignorecontents).concat(globs);
	}

	if (setup) {
		console.log(`${sep}`);
		const { bold, magenta } = chalk;
		console.log(`   dir : ${bold(tildelize(dir))}`);
		if (res.isEmpty) configpath = "<prettier-defaults>";
		console.log(`config : ${relativize(configpath)}`);
		console.log(`ignore : ${relativize(ignorepath)}`);
		console.log(`notify : ${magenta(notify)}`);
		console.log(` quiet : ${magenta(log)}`);
	}

	if (res.isEmpty) {
		let msg = "Config file not found — using prettier defaults.";
		msg = `[${chalk.yellow("warn")}] ${msg}`;
		if (setup) msg = `${sep}\n${msg}`;
		console.log(msg);
	}

	return { dir, notify, log, tconfig, tignore, watcher, globs };
};
