"use strict";

const os = require("os");
const path = require("path");
const chalk = require("chalk");

const cwd = process.cwd();
const hdir = os.homedir();
const uos = os.platform();
const sep = "-".repeat("60");

/**
 * Replace home directory in path with '~'.
 *
 * @param  {string} p - The path.
 * @return {string} - The modified path.
 */
let tildelize = (p) => (p.startsWith(hdir) ? p.replace(hdir, "~") : p);

/**
 * Return object containing system platform.
 *
 * @return {object} - Object containing system information.
 */
let system = { mac: uos === "darwin", win: uos === "win32" };

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
let relativize = (p) => (p.startsWith(cwd) ? "./" + path.relative(cwd, p) : p);

/**
 * Make path absolute.
 *
 * @param  {string} p - The path.
 * @return {string} - The modified path.
 */
let absolutize = (p) => (!path.isAbsolute(p) ? path.resolve(p) : p);

module.exports = { sep, error, absolutize, relativize, tildelize, system };
