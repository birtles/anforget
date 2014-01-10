require.config({
  baseUrl: '../lib',
  paths: {
    core: '../lib-built/anforget-lib',
    app: '../app',
    jquery: 'jquery/jquery-2.0.3'
  }
});

require(['app/app'], function(app) {
  app.init();
});
