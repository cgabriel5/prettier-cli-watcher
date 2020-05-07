"use strict";

const nodeignore = require("ignore");
const { ignore } = require("./onchange.js");

/**
 * Determines which file watcher to use. Defaults to chokidar.
 *
 * @param  {string} dir - The directory to watch.
 * @param  {string} name - Name of file watcher to use.
 * @return {object} - The file watcher.
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
