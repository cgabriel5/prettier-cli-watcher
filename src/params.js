"use strict";

// Needed modules.
const fs = require("fs");
const path = require("path");
const temp = require("temp");
const chalk = require("chalk");
const log = require("fancy-log");
const fe = require("file-exists");
const de = require("directory-exists");
const minimist = require("minimist");
const escapereg = require("lodash.escaperegexp");
const { cosmiconfigSync } = require("cosmiconfig");
var toml = require("toml");

/**
 * Returns the data type of the provided object.
 *
 * @param  {*} object - The object to check.
 * @return {string} - The data type of the checked object.
 *
 * @resource [https://stackoverflow.com/questions/7390426/better-way-to-get-type-of-a-javascript-variable]
 */
let dtype = function (object) {
	// Will always return something like "[object {type}]".
	return Object.prototype.toString
		.call(object)
		.replace(/(\[object |\])/g, "")
		.toLowerCase();
};

/**
 * Converts a comma/pipe delimited string list into an array. Trims items
 *     as well.
 *
 * @param  {string} list - The list to convert to array.
 * @return {array} - The array.
 */
let toarray = (list) => {
	return list.split(/,|\|/).map((item) => {
		return item.trim();
	});
};

/**
 * Will return a RegExp object made from the provided ignoredirs parameter.
 *     Will be in the format: /((dir1|dirN)\\/)/. Special characters like
 *     the dot in .git will be escaped.
 *
 * @param  {array} array - The array of dirs to ignore.
 * @return {regexpObject} - The RegExp object.
 */
let dynamicreg = (array) => {
	// Add opening RegExp syntax.
	let source = ["(("];

	// Loop over every dir.
	for (let i = 0, l = array.length; i < l; i++) {
		// Add dir and a pipe "|" to source.
		source.push(escapereg(array[i]), "|");
	}
	// Remove the last "|" from array.
	source.pop();

	// Copy parts to create a left side path check for hound.
	let left_parts = [...source];
	// Remove the first item.
	left_parts.shift();
	// Add closing and ending patterns.
	left_parts.unshift("\\/((");
	left_parts.push("))");

	// Add closing RegExp syntax.
	source.push(")\\/)");

	// Create dynamic RegExp.
	let dynamic_regexp_right = new RegExp(source.join(""));
	let dynamic_regexp_left = new RegExp(left_parts.join(""));

	// Attach the left RegExp to the main right RegExp.
	dynamic_regexp_right.left_regexp = dynamic_regexp_left;
	// Store original input as a string for later access.
	dynamic_regexp_right.string = array.join("|");

	return dynamic_regexp_right;
};

/**
 * Get and parse CLI parameters.
 *
 * @return {object} - Object containing parameters and their values.
 */
module.exports = function () {
	// Parse/get parameters.
	const params = minimist(process.argv.slice(2));

	// Default ignored directories.
	const def_ignoredirs = "node_modules|bower_components|.git|dist";
	// Default allowed file extensions.
	const def_exts =
		"js|ts|jsx|json|css|scss|sass|less|html|vue|md|yaml|graphql";

	// Directory to watch.
	let dir = params.dir || process.cwd();

	// Directories to ignore.
	const ignoredirs = dynamicreg(toarray(params.ignoredirs || def_ignoredirs));
	const exts = toarray(params.extensions || def_exts);
	// Don't send OS notification when prettier fails formatting file?
	const nonotify = params.nonotify;
	// Don't log error/success output to terminal?
	const nolog = params.nolog;
	// Default file watcher to chokidar.
	const watcher = params.watcher || "chokidar";
	const configpath_ori = params.configpath;
	// Deflect time used to ignore rapid/quick file changes.
	let dtime = params.dtime; // In milliseconds.
	// Get the deflect time data type.
	let type_dtime = dtype(dtime);

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
	// Remove trailing slash from dir.
	if (dir.endsWith("/")) dir = dir.slice(0, -1);

	// If no deflect time is provided set a default.
	if (!dtime && type_dtime !== "number") {
		dtime = 500;
		type_dtime = "number";
	}

	// Check deflect time. Must be a number and positive.
	if (type_dtime !== "number") {
		console.log(
			`[${chalk.red("error")}] ${chalk.bold(
				"--dtime"
			)} must be a number represented in milliseconds (${chalk.bold(
				type_dtime
			)} was provided).`
		);
		process.exit();
	}
	if (dtime < 0) {
		console.log(
			`[${chalk.red("error")}] ${chalk.bold(
				"--dtime"
			)} must be a positive number.`
		);
		process.exit();
	}

	// Check if supplied file watcher is allowed.
	if (!["chokidar", "hound"].includes(watcher)) {
		console.log(
			`[${chalk.red("error")}] ${chalk.bold(
				"--watcher"
			)} "${watcher}" is not supported. Provide 'chokidar' or 'hound'.`
		);
		process.exit();
	}

	const app = "prettier";
	let config = {};
	let configpath = params.configpath;
	let usedconfigpath = "";
	if (configpath) {
		// Get absolute path if path is relative.
		// [https://www.stackoverflow.com/a/30450519]
		// [http://www.linfo.org/path.html]
		if (!path.isAbsolute(configpath)) configpath = path.resolve(configpath);
		const explorer = cosmiconfigSync(app);
		try {
			config = explorer.load(configpath);
			usedconfigpath = configpath;
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
			isEmpty: true,
			filepath: ""
		};
		config = res.config;
		usedconfigpath = res.filepath;
		// let rconfigpath = path.relative(process.cwd(), res.filepath);
	}

	temp.track(); // Automatically track/cleanup temp files at exit.
	// Create temporary prettier config file.
	let tempfile = temp.openSync({ prefix: `pcw.conf-`, suffix: ".json" }).path;
	fs.writeFileSync(tempfile, JSON.stringify(config, null, 2), "utf8");

	// Get needed chalk methods.
	const bold = chalk.bold;
	const blue = chalk.blue;
	const yellow = chalk.yellow;
	const magenta = chalk.magenta;

	// Print the used flags and their values.
	console.log(`--dir="${yellow(dir)}"`);
	console.log(`--configpath="${yellow(usedconfigpath)}"`);
	console.log(`--ignoredirs="${yellow(ignoredirs.string)}"`);
	console.log(`--extensions="${yellow(exts.join("|"))}"`);
	console.log(`--watcher="${yellow(watcher)}"`);
	console.log(`--dtime=${blue(dtime)}`);
	console.log(`--nonotify=${magenta(nonotify || false)}`);
	console.log(`--nolog=${magenta(nolog || false)}`);
	console.log(chalk.bold("Watching..."));

	return {
		dir,
		configpath,
		ignoredirs,
		exts,
		nonotify,
		nolog,
		tempfile,
		dtime,
		watcher_name: watcher
	};
};
