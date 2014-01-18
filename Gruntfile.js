module.exports = function(grunt) {
  'use strict';

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
        quotmark: 'single',
        unused: true,
        trailing: true,
      },
      all: ['Gruntfile.js', 'src/app/**/*.js', 'src/core/**/*.js' ]
    },

    qunit: {
      files: ['src/core/test/index.html']
    },

    connect: {
      'unit-test-server': {
        options: {
          port: 3000,
          base: 'src'
        }
      }
    },

    'saucelabs-qunit': {
      all: {
        options: {
          urls: [ 'http://localhost:3000/core/test/index.html' ],
          testname: 'Anforget unit tests',
          build: process.env.TRAVIS_BUILD_NUMBER || '(Local)',
          browsers: [{
            browserName: 'firefox',
            version: '26',
            platform: 'WIN7'
          }, {
            browserName: 'chrome',
            version: '31',
            platform: 'Windows 8.1'
          }, {
            browserName: 'internet explorer',
            version: '11',
            platform: 'Windows 8.1'
          }, {
            browserName: 'iphone',
            version: '6.0',
            platform: 'OS X 10.8'
          }]
        }
      }
    }
  });

  // Modules
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-saucelabs');

  // Tasks
  grunt.registerTask('default', ['jshint', 'requirejs']);

  var testTasks = [ 'jshint', 'requirejs', 'qunit' ];
  if (typeof process.env.SAUCE_ACCESS_KEY !== 'undefined') {
    testTasks.push('connect:unit-test-server', 'saucelabs-qunit');
  } else {
    console.log('No Sauce Labs key found, skipping Sauce Labs test');
  }
  grunt.registerTask('test', testTasks);
};
