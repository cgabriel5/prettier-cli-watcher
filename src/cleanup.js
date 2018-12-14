"use strict";

// Needed modules.
const fs = require("fs");
const cleanup = require("node-cleanup");
const tmp_filepath = require("./tp.js");

/**
 * Module cleanup. Removed the created temp from of the user's
 * prettier config file.
 *
 * @return {undefined} - Nothing is returned.
 */
module.exports = function() {
	// Module cleanup.
	cleanup(function(exit_code, signal) {
		if (signal) {
			// Remove user prettier config temp file.
			fs.unlink(tmp_filepath, () => {
				// Kill process to inform parent process of signal.
				process.kill(process.pid, signal);
			});
			// Don't call cleanup handler again.
			cleanup.uninstall();
			return false;
		}
	});
};
