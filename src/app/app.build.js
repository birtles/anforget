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
  name: "app/app",
  out: "../lib-built/anforget.js",

  // Allow use strict since we're only targetting newer browsers
  useStrict: true,

  // Include require in the package
  paths: { requireLib: "require" },
  include: "requireLib"
})
