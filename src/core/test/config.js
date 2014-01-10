require.config({
  baseUrl: '../../lib',
  paths: {
    core: '../core',
    qunit: 'test/qunit/qunit-1.13.0',
    jquery: 'jquery/jquery-2.0.3'
  },
  shim: {
     'qunit': {
         exports: 'QUnit',
         init: function() {
             QUnit.config.autostart = false;
             QUnit.init();
         }
     } 
  }
});

require(['qunit', 'core/test/sync'], function(QUnit) {
  QUnit.load();
});
