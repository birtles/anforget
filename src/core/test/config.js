require.config({
  baseUrl: '../../lib',
  paths: {
    core: '../core',
    jquery: 'jquery/jquery-2.0.3'
  }
});

require(['core/test/sync'], function() {
  QUnit.start();
});
