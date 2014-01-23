define(['core/sync', 'sinonjs'], function(SyncConnection, sinon) {
  var server;

  QUnit.module('Sync tests', {
    setup: function() {
      server = sinon.fakeServer.create();
    },
    teardown: function() {
      server.restore();
    }
  });

  test('Server trailing slash', function() {
    var conn = new SyncConnection({ url: 'http://localhost/' });
    conn.sync();
    equal(server.requests[0].url, 'http://localhost/hostKey',
          'Trailing slash in server URL is ok');

    conn = new SyncConnection({ url: 'http://localhost' });
    conn.sync();
    equal(server.requests[1].url, 'http://localhost/hostKey',
          'No trailing slash in server URL is ok');
  });

  test('Test get host key', function() {
    var conn = new SyncConnection(
      { url: 'http://localhost/',
        username: 'abc',
        password: 'def' });
    conn.sync();
    equal(server.requests[0].method, 'POST');
    deepEqual(JSON.parse(server.requests[0].requestBody),
              { u: 'abc', p: 'def' });

    server.requests[0].respond(200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ key: 'ghi' }));

    // XXX Test that if there is no error we don't call hostKey twice
  });
});
