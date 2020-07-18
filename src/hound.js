// Copyright (c) 2012, Michael Alexander
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// The views and conclusions contained in the software and documentation are those
// of the authors and should not be interpreted as representing official policies,
// either expressed or implied, of the hound Project.
//
// -----------------------------------------------------------------------------
//
// Copyright (c) 2018, Carlos Gabriel
// All rights reserved.
//
// [https://github.com/gforceg/node-hound]
// hound.js code modified to work with prettier-cli-watcher.

"use strict";

const fs = require("fs");
const path = require("path");
const util = require("util");
const events = require("events");
const flatry = require("flatry");
const { lstats, exists, readdir } = require("./filesystem.js");

/**
 * Watch one or more files or directories for changes.
 *
 * Options:
 *   - watchFn: Specify a custom filesystem watch function (eg: `fs.watchFile`)
 *
 * @param {string|array} src The file or directory to watch.
 * @param {array} options
 * @return {Hound}
 */
exports.watch = function (src, options) {
	var watcher = new Hound(options);
	watcher.watch(src);
	return watcher;
};

/**
 * The Hound class tracks watchers and changes and emits events.
 */
function Hound(options) {
	events.EventEmitter.call(this);
	this.options = options || {};
}
util.inherits(Hound, events.EventEmitter);
Hound.prototype.watchers = [];

// Lookup table of files to ignore via --ignore flag.
let skip = {};

/**
 * Watch a file or directory tree for changes, and fire events when they happen.
 * Fires the following events:
 * 'create' (file, stats)
 * 'change' (file, stats)
 * 'delete' (file)
 * @param {string} src
 * @return {Hound}
 */
Hound.prototype.watch = async function (src) {
	var self = this;
	const { ignored } = self.options;

	if (skip[src] || (await ignored(src))) {
		skip[src] = true;
		return;
	}

	let [err, res] = await flatry(lstats(src));
	if (err) return;
	var lastChange = null;
	var watchFn = self.options.watchFn || fs.watch;

	if (res.is.directory) {
		let paths = await readdir(src);
		for (let i = 0, l = paths.length; i < l; i++) {
			let p = path.join(src, paths[i]);
			if (!(await ignored(p))) self.watch(p);
			else skip[p] = true;
		}
	}
	// async functions: [https://stackoverflow.com/a/42964310]
	self.watchers[src] = watchFn(src, async function (/*event, filename*/) {
		let [err, res] = await flatry(exists(src));
		if (res) {
			let [err, stats] = await flatry(lstats(src));
			if (stats.is.file) {
				if (lastChange === null || stats.mtime.getTime() > lastChange) {
					if (stats.size) {
						self.emit("change", src, stats);
						// SHOULD THIS BE LEFT OUT OF THE CODE BLOCK???
						// [THE COMMENTED OUT LINE BELOW]
						lastChange = stats.mtime.getTime();
					}
				}
				// lastChange = stats.mtime.getTime();
			} else if (stats.is.directory) {
				// Check if the dir is new
				// if (self.watchers[src] === undefined) { // self.emit("create", src, stats); }
				// Check files to see if there are any new files
				let dirFiles = await readdir(src);
				for (var i = 0, len = dirFiles.length; i < len; i++) {
					var file = src + path.sep + dirFiles[i];
					if (self.watchers[file] === undefined) {
						if (skip[src] || (await ignored(file))) continue;
						else self.watch(file);
						// self.emit("create", file, fs.statSync(file));
					}
				}
			}
		} else {
			self.unwatch(src);
			// self.emit("delete", src);
		}
	});
	// self.emit("watch", src);
};

/**
 * Unwatch a file or directory tree.
 * @param {string} src
 */
Hound.prototype.unwatch = function (src) {
	var self = this;
	if (self.watchers[src] !== undefined) {
		self.watchers[src].close();
		delete self.watchers[src];
	}
	self.emit("unwatch", src);
};

/**
 * Unwatch all currently watched files and directories in this watcher.
 */
Hound.prototype.clear = function () {
	var self = this;
	for (var file in this.watchers) {
		self.unwatch(file);
	}
};
