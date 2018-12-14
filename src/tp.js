"use-strict";

// Needed modules.
const path = require("path");

// User temporary prettier config (tpc) file path: User prettier config
// files will, more than likely, contain the "parser" option. To let
// prettier format all allowed file extension types we needed to let
// it figure out what parser to use via the file's extension. Therefore,
// the user's config is copied to a temporary file the the parser option
// removed. The tp file is removed when prettier-cli-watcher closes.
module.exports = path.join(__dirname, ".tpc.json");
