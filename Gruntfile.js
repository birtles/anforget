module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    requirejs: {
      compile: {
        // The following options are mostly the same as src/app/app.build.js and
        // the two should be kept in sync.
        //
        // Both are provided so it's still possible to run r.js by hand to
        // provide different options during development such as excludeShallow.
        options: {
          // Basic setup
          baseUrl: 'src/lib',
          mainConfigFile: 'src/app/app.config.js',

          // Optimization
          optimize: 'uglify2',
          generateSourceMaps: true,
          preserveLicenseComments: false,
          uglify2: {
            output: { beautify: true },
          },
          name: 'app/app',
          out: 'www/js/<%= pkg.name %>.js',

          // Allow use strict since we're only targetting newer browsers
          useStrict: true,

          // Include require in the package
          paths: { requireLib: 'require' },
          include: 'requireLib'
        }
      }
    },
    jshint: {
      options: {
        // r.js build profiles aren't proper functions
        ignores: [ '**/*.build.js' ],
        indent: 2,
        quotmark: 'single'
      },
      all: ['Gruntfile.js', 'src/app/**/*.js', 'src/core/**/*.js' ]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'requirejs']);
};
