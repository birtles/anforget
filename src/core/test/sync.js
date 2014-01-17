define(['core/sync', 'qunit'], function(Sync, QUnit) {
  QUnit.module('Sync tests');
  test('Test ctor', function() {
    var sync = new Sync('a', 'b');
    ok(sync.username, 'a');
    ok(sync.password, 'b');
  });
});
