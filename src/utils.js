"use strict";

const os = require("os");
const path = require("path");
const chalk = require("chalk");

const sep = "-".repeat("60");

/**
 * Returns the data type of the provided object.
 *
 * @param  {*} object - The object to check.
 * @return {string} - The data type of the checked object.
 *
 * @resource [https://stackoverflow.com/q/7390426]
 */
// let dtype = function (object) {
// 	// Will always return something like "[object {type}]".
// 	return Object.prototype.toString
// 		.call(object)
// 		.replace(/(\[object |\])/g, "")
// 		.toLowerCase();
// };

/**
 * Replace homd directory in path with '~'.
 *
 * @param  {string} p - The path.
 * @return {string} - The modified path.
 */
let tildelize = (p) => {
	const hdir = os.homedir();
	if (p.startsWith(hdir)) p = p.replace(hdir, "~");
	return p;
};

const uos = os.platform();
let system = () => ({ mac: uos === "darwin", win: uos === "win32" });

/**
 * Prints error and exists process.
 *
 * @param  {string} msg - The error message.
 * @return {undefined} - Nothing is returned.
 */
let error = (msg) => {
	console.log(`[${chalk.red("error")}] ${msg}`);
	process.exit();
};

/**
 * Make path relative.
 *
 * @param  {string} p - The path.
 * @return {string} - The modified path.
 */
let relativize = (p) => {
	let cwd = process.cwd();
	if (p.startsWith(cwd)) p = "./" + path.relative(cwd, p);
	return p;
};

module.exports = { sep, error, relativize, tildelize, system };
