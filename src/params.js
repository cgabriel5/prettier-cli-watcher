"use strict";

const fs = require("fs");
const path = require("path");
const temp = require("temp");
const toml = require("toml");
const chalk = require("chalk");
const log = require("fancy-log");
const fe = require("file-exists");
const dirglob = require("dir-glob");
const de = require("directory-exists");
const minimist = require("minimist");
const escapereg = require("lodash.escaperegexp");
const { cosmiconfigSync } = require("cosmiconfig");
const { dtype, tildelize } = require("./utils.js");
const parseignore = require("parse-gitignore");

/**
 * Get and parse CLI parameters.
 *
 * @return {object} - Object containing parameters and their values.
 */
module.exports = function () {
	const params = minimist(process.argv.slice(2));

	const g = params.ignore;
	let globs = g || [];
	if (globs.length) {
		globs = typeof g === "string" ? [g] : g;
		globs = dirglob.sync(globs);
	}

	let defdir = process.cwd();
	let dir = params.dir || defdir;
	if (dir && dir === true) dir = defdir;
	if (dir === "." || dir === "./") dir = defdir;
	if (dir.endsWith("/")) dir = dir.slice(0, -1);

	const notify = params.notify || false;
	// [https://github.com/substack/minimist/issues/123]
	// const log = !(params.log === false);
	const log = params.quiet || false;
	const watcher = params.watcher || "chokidar";
	const configpath_ori = params.config;
	let ignorepath = params["ignore-path"];
	let dtime = params.deflect;
	if (!dtime || dtype(dtime) !== "number" || dtime < 0) dtime = 500;
	const setup = params.setup;

	// Directory must exist.
	if (!path.isAbsolute(dir)) dir = path.resolve(dir);
	if (!de.sync(dir)) {
		console.log(
			`[${chalk.red("error")}] ${chalk.bold(
				"--dir"
			)} ${chalk.bold.magenta(dir)} does not exist.`
		);
		process.exit();
	}

	// Check if supplied file watcher is allowed.
	if (!["chokidar", "hound"].includes(watcher)) watcher = "chokidar";

	let res = {};
	let config = {};
	const app = "prettier";
	let usedconfigpath = "";
	let configpath = params.config;
	if (configpath) {
		// Get absolute path if path is relative.
		// [https://www.stackoverflow.com/a/30450519]
		// [http://www.linfo.org/path.html]
		if (!path.isAbsolute(configpath)) configpath = path.resolve(configpath);
		const explorer = cosmiconfigSync(app);
		try {
			res = explorer.load(configpath);
		} catch (err) {
			let issue = "Could not parse config";
			if (err.syscall && err.syscall === "open") {
				issue = "Could not find config";
			}
			console.log(
				`[${chalk.red("error")}] ${issue}: ${chalk.bold(configpath)}.`
			);
			process.exit();
		}
	} else {
		// Go through project for a config file.
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
						console.log(
							`[${chalk.red("error")}] ` +
								"TOML Parsing error on line " +
								e.line +
								", column " +
								e.column +
								": " +
								e.message
						);
						process.exit();
					}
				}
			}
		});
		explorer.clearCaches();
		res = explorer.search() || { config: {}, isEmpty: true, filepath: "" };
	}

	config = res.config;
	usedconfigpath = res.filepath;

	let ignorecontents = "";
	let usedignorepath = "";
	if (ignorepath) {
		if (!path.isAbsolute(ignorepath)) ignorepath = path.resolve(ignorepath);
		if (!fe.sync(ignorepath)) {
			let issue = "Could not open ";
			console.log(
				`[${chalk.red("error")}] ${issue}: ${chalk.bold(ignorepath)}.`
			);
			process.exit();
		}
		ignorecontents = fs.readFileSync(ignorepath, "utf8");
		usedignorepath = ignorepath;
	} else {
		const exp = cosmiconfigSync(app, {
			searchPlaces: [`.${app}ignore`, `configs/${app}ignore`],
			loaders: { noExt: (filepath, content) => content }
		});
		exp.clearCaches();
		let igres = exp.search() || { config: "", isEmpty: true, filepath: "" };
		ignorecontents = igres.config;
		ignorepath = igres.filepath;
		usedignorepath = ignorepath;
	}

	// If config file is relative to watch dir, make path relative.
	if (usedignorepath.startsWith(process.cwd())) {
		usedignorepath = "./" + path.relative(process.cwd(), usedignorepath);
	}

	// If config file is relative to watch dir, make path relative.
	if (usedconfigpath.startsWith(process.cwd())) {
		usedconfigpath = "./" + path.relative(process.cwd(), usedconfigpath);
	}

	// res.isEmpty = true;

	temp.track(); // Automatically track/cleanup temp files at exit.
	let tempfile = temp.openSync({ prefix: `pcw.conf-`, suffix: ".json" }).path;
	fs.writeFileSync(tempfile, JSON.stringify(config, null, 2), "utf8");

	if (usedignorepath) {
		ignorepath = temp.openSync({ prefix: `pcw.ig-`, suffix: ".ig" }).path;
		fs.writeFileSync(ignorepath, ignorecontents, "utf8");

		let ignores = parseignore(ignorecontents);
		if (ignores) globs = ignores.concat(dirglob.sync(globs));
	}

	// Print the used flags and their values.
	const sep = "-".repeat("60");
	if (setup) {
		console.log(`${sep}`);
		const { bold, blue, yellow, magenta } = chalk;
		console.log(`   dir : ${bold(tildelize(dir))}`);
		if (res.isEmpty) usedconfigpath = "<prettier-defaults>";
		console.log(`config : ${usedconfigpath}`);
		console.log(`ignore : ${usedignorepath}`);
		// console.log(`ignore  : ${globs.join(" ; ")}`);
		// console.log(`watcher : ${watcher}`);
		// console.log(`deflect : ${blue(dtime)}`);
		console.log(`notify : ${magenta(notify)}`);
		console.log(` quiet : ${magenta(log)}`);
		// console.log(`${sep}`);
	}

	// Warn when config file was not found.
	if (res.isEmpty) {
		let msg = "Config file not found — using prettier defaults.";
		msg = `[${chalk.yellow("warn")}] ${msg}`;
		if (setup) msg = `${sep}\n${msg}`;
		console.log(msg);
	}

	return {
		dir,
		notify,
		log,
		config: tempfile,
		ignore: ignorepath,
		watcher,
		dtime,
		globs
	};
};
