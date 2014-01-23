require.config({
  baseUrl: '../../lib',
  paths: {
    core: '../core',
    jquery: 'jquery/jquery-2.0.3',
    sinonjs: 'test/sinonjs/sinon-1.7.3'
  },
  shim: {
    sinonjs: { exports: 'sinon' }
  }
});

require(['core/test/sync'], function() {
  QUnit.start();

  // For exposing results to Sauce Labs
  QUnit.done(function(results){
    window.global_test_results = results;
  });
});
