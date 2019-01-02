"use strict";

/**
 * Determines which file watcher to use. Defaults to chokidar if nothing was
 *     explicitly requested.
 *
 * @param  {string} dir - The directory to watch.
 * @param  {string} watcher_name - Name of file watcher to use.
 * @param  {regexp} ignoredirs - RegExp object used to filter dirs/files.
 * @return {object} - The file watcher.
 */
module.exports = function(dir, watcher_name, ignoredirs) {
	// Use chokidar by default.
	let watcher = "chokidar";
	// The watcher options.
	let options = {};

	if (watcher_name === "chokidar") {
		options = {
			persistent: true,
			alwaysStat: true,
			ignoreInitial: true,
			ignored: filepath => {
				// Ignore paths containing following folders.
				return ignoredirs.test(filepath);
			}
		};
	} else if (watcher_name === "hound") {
		watcher = "./hound.js";

		options = {
			// Pass dynamic RegExp.
			ignored: ignoredirs
		};
	}

	// Get, initialize, and return watcher.
	return require(watcher).watch(dir, options);
};
