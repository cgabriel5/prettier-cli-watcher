"use strict";

const os = require("os");

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

module.exports = { tildelize };
