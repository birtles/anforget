require.config({
  // baseUrl is relative to where this file is included from which, in this case
  // is www/
  baseUrl: '../src/lib',
  paths: {
    core: '../core',
    app: '../app',
    jquery: 'jquery/jquery-2.0.3'
  }
});

require(['app/app'], function(app) {
  app.init();
});
