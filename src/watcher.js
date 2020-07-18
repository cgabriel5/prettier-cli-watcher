"use strict";

const nodeignore = require("ignore");
const { ignore } = require("./onchange.js");

/**
 * Determines which file watcher to use.
 *
 * @param  {string} dir - The directory to watch.
 * @param  {string} name - File watcher name.
 * @param  {array} globs - Globs to test paths against (ignored) .
 * @return {object} - The watcher.
 */
module.exports = function (dir, name, globs) {
	let ishound = name === "hound";
	const ig = nodeignore().add(globs);
	let opts = { persistent: true, alwaysStat: true, ignoreInitial: true };
	if (ishound) opts.ignored = async (p) => await ignore.async(p, ig);
	else opts.ignored = (p) => ignore(p, ig);
	return require(!ishound ? "chokidar" : "./hound.js").watch(dir, opts);
};
