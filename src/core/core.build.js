// Keep these options in sync with those in /Gruntfile.js
//
// Run by hand using node.js -o app.build.js
({
  // Basic setup
  mainConfigFile: "config.js",

  // Optimization
  optimize: "uglify2",
  generateSourceMaps: true,
  preserveLicenseComments: false,
  uglify2: {
    output: { beautify: true },
  },
  name: "core/core",
  out: "../lib-built/anforget-lib.js",

  // Allow use strict since we're only targetting newer browsers
  useStrict: true
})
