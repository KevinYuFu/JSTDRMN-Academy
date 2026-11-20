const Module = require("module");
const path = require("path");

const empty = path.join(path.dirname(require.resolve("server-only")), "empty.js");
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return empty;
  return resolveFilename.call(this, request, parent, isMain, options);
};
