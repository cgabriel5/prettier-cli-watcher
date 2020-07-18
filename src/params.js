"use strict";

const fs = require("fs");
const temp = require("temp");
const toml = require("toml");
const chalk = require("chalk");
const fe = require("file-exists");
const minimist = require("minimist");
const de = require("directory-exists");
const parseignore = require("parse-gitignore");
const { cosmiconfigSync } = require("cosmiconfig");
const { sep, error, absolutize, relativize, tildelize } = require("./utils.js");

module.exports = function () {
	const params = minimist(process.argv.slice(2));

	if (params.version || params.v) {
		console.log(require("../package.json").version);
		process.exit();
	}

	let cwd = process.cwd();
	let dir = absolutize(typeof params.dir !== "string" ? cwd : params.dir);
	// // dir can't be out-of-bounds: [https://stackoverflow.com/a/45242825]
	// const rel = path.relative(cwd, dir);
	// const ischildpath = rel && !rel.startsWith("..") && !path.isAbsolute(rel);
	// if (!ischildpath && rel) error(`--dir ${dir} is out-of-bounds.`);
	if (!de.sync(dir)) error(`--dir ${dir} doesn't exist.`);
	// User must have permission to dir path.
	// [https://stackoverflow.com/a/36146196]
	try {
		fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
	} catch (err) {
		error(`Permission denied, can't access: ${dir}`);
	}

	let globs = [];
	const app = "prettier";
	let configpath = params.config || "";
	let ignorepath = params.ignore || "";
	if (typeof configpath !== "string") configpath = undefined;
	if (typeof ignorepath !== "string") ignorepath = undefined;

	const setup = params.setup;
	const log = params.quiet || false;
	const notify = params.notify || false;
	const dry = !(params.dry === undefined);
	let watcher = params.watcher || "chokidar";
	if (!["chokidar", "hound"].includes(watcher)) watcher = "chokidar";

	let dtime = params.deflect || 500;
	if (typeof dtime !== "number") dtime = 500;
	if (dtime < 0) dtime = 0;

	let res = {};
	if (configpath) {
		configpath = absolutize(configpath);
		const explorer = cosmiconfigSync(app);
		try {
			res = explorer.load(configpath);
		} catch (err) {
			let issue = "parse config";
			if (err.syscall && err.syscall === "open") issue = "find config";
			error(`Couldn't ${issue}: ${relativize(configpath)}.`);
		}
	} else {
		const explorer = cosmiconfigSync(app, {
			stopDir: cwd,
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

	let igres = {};
	let tignore = "";
	let ignorecontents = "";
	if (ignorepath) {
		ignorepath = absolutize(ignorepath);
		if (!fe.sync(ignorepath)) error(`Couldn't open: ${ignorepath}.`);
		ignorecontents = fs.readFileSync(ignorepath, "utf8");
	} else {
		const exp = cosmiconfigSync(app, {
			stopDir: cwd,
			searchPlaces: [`.${app}ignore`, `configs/${app}ignore`],
			loaders: { noExt: (filepath, content) => content }
		});
		exp.clearCaches();
		igres = exp.search() || { config: "", isEmpty: true, filepath: "" };
		ignorecontents = igres.config;
		ignorepath = igres.filepath;
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
		console.log(`config : ${tildelize(relativize(configpath))}`);
		console.log(`ignore : ${tildelize(relativize(ignorepath))}`);
		console.log(`notify : ${magenta(notify)}`);
		console.log(` quiet : ${magenta(log)}`);
		console.log(`   dry : ${magenta(dry)}`);
	}

	if (res.isEmpty) {
		let msg = "Prettier config not found (using prettier defaults).";
		msg = `[${chalk.yellow("warn")}] ${msg}`;
		if (setup) msg = `${sep}\n${msg}`;
		console.log(msg);
	}
	if (igres.isEmpty) {
		let msg = ".prettierignore not found (watching entire --dir).";
		msg = `[${chalk.yellow("warn")}] ${msg}`;
		if (setup) msg = `${sep}\n${msg}`;
		console.log(msg);
	}

	return { dir, dry, notify, log, tconfig, tignore, watcher, globs, dtime };
};
