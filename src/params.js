"use strict";

// Needed modules.
const fs = require("fs");
const path = require("path");
const temp = require("temp");
const chalk = require("chalk");
const log = require("fancy-log");
const fe = require("file-exists");
const minimist = require("minimist");
const escapereg = require("lodash.escaperegexp");

/**
 * Converts a comma/pipe delimited string list into an array. Trims items
 *     as well.
 *
 * @param  {string} list - The list to convert to array.
 * @return {array} - The array.
 */
var toarray = list => {
	return list.split(/,|\|/).map(item => {
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
var dynamicreg = array => {
	// Add opening RegExp syntax.
	let source = ["(("];

	// Loop over every dir.
	for (let i = 0, l = array.length; i < l; i++) {
		// Add dir and a pipe "|" to source.
		source.push(escapereg(array[i]), "|");
	}
	// Remove the last "|" from array.
	source.pop();
	// Add closing RegExp syntax.
	source.push(")\\/)");

	// Create dynamic RegExp.
	let dr = new RegExp(source.join(""));

	// Store original input as a string for later access.
	dr.string = array.join("|");

	return dr;
};

/**
 * Prep and cleanup path so that it works with chokidar.
 *
 * @param  {string} path - The path to prep.
 * @return {string} - The prepped path.
 */
var preppath = path => {
	// Possible transforms:
	// ./     → .
	// /      → .
	// .      → .
	// /dir   → dir
	// /dir/  → dir
	// ./dir/ → dir

	// Remove the starting "./?" and trailing "/" from path.
	path = path.replace(/^(\.?\/)|\/$/g, "");

	// Reset path if it's a single dot.
	if (path === ".") {
		path = "";
	}

	return path === "" ? "." : path;
};

/**
 * Get and parse CLI parameters.
 *
 * @return {object} - Object containing parameters and their values.
 */
module.exports = function() {
	// Parse/get parameters.
	const params = minimist(process.argv.slice(2));

	// Default ignored directories.
	const def_ignoredirs = "node_modules|bower_components|.git|dist";
	// Default allowed file extensions.
	const def_exts =
		"js|ts|jsx|json|css|scss|sass|less|html|vue|md|yaml|graphql";

	// Directory to watch.
	const dir = preppath(params.dir || ".");
	// Directories to ignore.
	const ignoredirs = dynamicreg(toarray(params.ignoredirs || def_ignoredirs));
	const exts = toarray(params.extensions || def_exts);
	// Don't send OS notification when prettier fails formatting file?
	const nonotify = params.nonotify;
	// Don't log error/success output to terminal?
	const nolog = params.nolog;
	const configpath_ori = preppath(params.configpath);

	// If a configpath is not provided exit and warn user.
	if (!configpath_ori) {
		console.log(
			`[${chalk.red("error")}] ${chalk.bold(
				"--configpath"
			)} is required but wasn't provided.`
		);
		process.exit();
	}

	// Resolve the config file path.
	const configpath = path.resolve(process.cwd(), preppath(params.configpath));

	// If the file does not exist also exit.
	if (!fe.sync(configpath)) {
		console.log(
			`[${chalk.red("error")}] ${chalk.bold(
				"--configpath"
			)} file path ${chalk.bold.magenta(configpath)} does not exist.`
		);
		process.exit();
	}

	// Get config file contents.
	let config = require(configpath);
	// Note: Remove the parser option to let prettier determine the correct parser to use.
	delete config.parser;

	// Automatically track and cleanup temp files at exit.
	temp.track();
	// Create temporary prettier config file.
	let { path: tmp_filepath } = temp.openSync({ suffix: ".json" });
	// Save user's prettier config to temporary file.
	fs.writeFileSync(tmp_filepath, JSON.stringify(config), "utf8");

	// Get needed chalk methods.
	const bold = chalk.bold;
	const yellow = chalk.yellow;
	const magenta = chalk.magenta;

	// Print the used flags and their values.
	log(`${bold("Running")} with listed setup:`);
	log(`  ${bold("--dir")}="${yellow(dir)}"`);
	log(`  ${bold("--configpath")}="${yellow(configpath_ori)}"`);
	log(`  ${bold("--ignoredirs")}="${yellow(ignoredirs.string)}"`);
	log(`  ${bold("--extensions")}="${yellow(exts.join("|"))}"`);
	log(`  ${bold("--nonotify")}=${magenta(nonotify || false)}`);
	log(`  ${bold("--nolog")}=${magenta(nolog || false)}`);

	return {
		dir,
		configpath,
		ignoredirs,
		exts,
		nonotify,
		nolog,
		tmp_filepath
	};
};
