"use strict";

const os = require("os");

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

module.exports = { dtype, tildelize, system };
