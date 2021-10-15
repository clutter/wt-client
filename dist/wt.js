"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./wt.min.js");
} else {
  module.exports = require("./wt.dev.js");
}
