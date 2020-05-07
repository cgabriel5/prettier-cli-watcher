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
	const ig = nodeignore().add(globs);
	return require(name !== "hound" ? "chokidar" : "./hound.js").watch(dir, {
		persistent: true,
		alwaysStat: true,
		ignoreInitial: true,
		ignored: (p) => ignore(p, ig)
	});
};
