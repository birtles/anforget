define(['core/sync', 'sinonjs', 'gzip'], function(SyncConnection, sinon, gzip) {
  var server;

  function MockFormData(form) {
    this._form = form;
    this._data = [];

    this.append = function(name, value, filename) {
      this._data.push({ name: name, value: value, filename: filename});
    };
  }

  var existingFormData;

  QUnit.module('Sync tests', {
    setup: function() {
      if (typeof FormData != "function" && typeof FormData != "object") {
        // There should be an existing implementation of FormData even if it is
        // only a polyfilled one. Otherwise, subbing in a mock object here would
        // mask a compatibility issue.
        ok(false, 'No existing implementation of FormData');
      }
      existingFormData = window.FormData;
      window.FormData = MockFormData;
      server = sinon.fakeServer.create();
    },
    teardown: function() {
      window.FormData = existingFormData;
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

  asyncTest('Get host key', function() {
    var conn = new SyncConnection(
      { url: 'http://localhost/',
        username: 'abc',
        password: 'def' });
    conn.sync();
    equal(server.requests[0].method, 'POST', 'has post method');
    equal(server.requests[0].requestBody._data.length, 2,
          'has two items in the request');
    deepEqual(server.requests[0].requestBody._data[0],
              { name: 'c', value: '1', filename: undefined });
    deepEqual(server.requests[0].requestBody._data[1].name, 'data');
    deepEqual(server.requests[0].requestBody._data[1].filename, 'data');
    var blob = server.requests[0].requestBody._data[1].value;

    var reader = new FileReader();
    // We'd like to use addEventListener but the version of WebKit in phantomjs
    // only supports onload
    reader.onload = function() {
      try {
        var unzipped = gzip.unzip(new Uint8Array(reader.result));
        var json = String.fromCharCode.apply(null,
                     Array.prototype.slice.apply(unzipped));
        var obj = JSON.parse(json);
        deepEqual(obj, { u: 'abc', p: 'def' });
      } catch (e) {
        ok(false, e);
      }
    };
    reader.onerror = function() {
      ok(false, 'error reading blob');
    }
    // Call start regardless of failure or success
    reader.onloadend = function() {
      start();
    };
    reader.readAsArrayBuffer(blob);

    // XXX Continue
    /*
    server.requests[0].respond(200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ key: 'ghi' }));
      */

    // XXX Test that if there is no error we don't call hostKey twice
  });
});
