"use strict";

/**
 * Determines which file watcher to use. Defaults to chokidar if nothing was
 *     explicitly requested.
 *
 * @param  {string} dir - The directory to watch.
 * @param  {string} watcher_name - Name of file watcher to use.
 * @param  {regexp} ignoredirs - RegExp object used to filter dirs/files.
 * @param  {object} system - Device platform information.
 * @return {object} - The file watcher.
 */
module.exports = function (dir, watcher_name, ignoredirs, system) {
	let watcher = "chokidar";
	let options = {};

	if (watcher_name === "chokidar") {
		options = {
			persistent: true,
			alwaysStat: true,
			ignoreInitial: true,
			ignored: (filepath) => ignoredirs.test(filepath)
		};
	} else if (watcher_name === "hound") {
		watcher = "./hound.js";
		options = { system, ignored: ignoredirs };
	}

	return require(watcher).watch(dir, options);
};
