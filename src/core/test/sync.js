define(['core/sync'], function(Sync) {
  QUnit.module('Sync tests');
  test('Test ctor', function() {
    var sync = new Sync('a', 'b');
    strictEqual(sync.username, 'a');
    strictEqual(sync.password, 'b');
  });
});
