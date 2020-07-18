"use strict";

const fs = require("fs");

/**
 * Wrapper for readFile method. Returns a Promise.
 *
 * @param  {string} p - The path of file to read.
 * @return {promise} - Promise is returned.
 */
let readdir = (p) => {
	return new Promise((resolve, reject) => {
		fs.readdir(p, (err, list) => {
			if (err) reject(err);
			resolve(list);
		});
	});
};

/**
 * Get file paths stats.
 *
 * @param  {string} p - The file path to use.
 * @return {object} - The file path's stats object.
 *
 * @resource [https://stackoverflow.com/a/15630832]
 * @resource [https://pubs.opengroup.org/onlinepubs/7908799/xsh/lstat.html]
 * @resource [https://www.brainbell.com/javascript/fs-stats-structure.html]
 */
let lstats = (p) => {
	return new Promise((resolve, reject) => {
		fs.lstat(p, (err, stats) => {
			if (err) reject(err);

			// Add other pertinent information to object:
			// [https://stackoverflow.com/a/15630832]
			// [https://stackoverflow.com/a/11287004]
			stats.is = {
				file: stats.isFile(),
				directory: stats.isDirectory(),
				blockdevice: stats.isBlockDevice(),
				characterdevice: stats.isCharacterDevice(),
				symlink: stats.isSymbolicLink(),
				fifo: stats.isFIFO(),
				socket: stats.isSocket()
			};

			resolve(stats);
		});
	});
};

/**
 * Checks if path exists.
 *
 * @param  {string} p - The path to use.
 * @return {boolean} - True if exists, else false.
 */
let exists = (p) => {
	return new Promise((resolve /*, reject*/) => {
		fs.lstat(p, (err /*, stats*/) => resolve(!err));
	});
};

module.exports = { readdir, lstats, exists };
