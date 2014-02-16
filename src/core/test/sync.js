define(['core/sync', 'sinonjs', 'gzip', 'promise'],
  function(SyncConnection, sinon, gzip) {

  var server,
      existingFormData;

  QUnit.module('Sync tests', {
    setup: function() {
      if (typeof FormData != 'function' && typeof FormData != 'object') {
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
    var conn = new SyncConnection({ url: 'http://abc/' });
    conn.sync();
    equal(server.requests[0].url, 'http://abc/hostKey',
          'allows trailing slash in server URL');

    conn = new SyncConnection({ url: 'http://def' });
    conn.sync();
    equal(server.requests[1].url, 'http://def/hostKey',
          'allows no trailing slash in server URL');
  });

  asyncTest('Get host key', function() {
    var conn = new SyncConnection({ url: 'http://localhost/',
                                    username: 'abc',
                                    password: 'def' });
    equal(conn.status, 'idle', 'is initially idle');
    conn.sync();
    equal(conn.status, 'logging-in', 'logging-in status');

    equal(server.requests[0].method, 'POST', 'has post method');
    equal(server.requests[0].requestBody._data.length, 2,
          'has two items in the request');
    deepEqual(server.requests[0].requestBody._data[0],
              { name: 'c', value: '1', filename: undefined },
              'has correct c chunk');
    var dataChunk = server.requests[0].requestBody._data[1];
    deepEqual({ name: dataChunk.name, filename: dataChunk.filename },
       { name: 'data', filename: 'data' },
       'data chunk properties set correctly');

    readBlob(dataChunk.value).then(function(obj) {
      deepEqual(obj, { u: 'abc', p: 'def' }, 'username/password set correctly');
      server.requests[0].respond(200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ key: 'ghi' }));
      return waitForStatusChange(conn);
    }).then(function() {
      equal(conn.status, 'getting-summary', 'getting-summary status');
      equal(server.requests.length, 2, 'makes next request');
      deepEqual(server.requests[1].requestBody._data[1],
                { name: 'k', value: 'ghi', filename: undefined },
                'uses returned hostKey for next request');
    }).catch(function(err) {
      ok(false, err);
    }).then(function() {
      start();
    });
  });

  asyncTest('Get host key twice', function() {
    var conn = new SyncConnection({ url: 'http://localhost/',
                                    username: 'abc',
                                    password: 'def' });
    conn.sync();
    server.requests[0].respond(200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ key: 'ghi' }));
    waitForStatusChange(conn).then(function() {
      conn.sync();
      return waitForStatusChange(conn);
    }).then(function() {
      // We should have one hostKey request followed by two meta requests
      equal(server.requests.length, 3, 'requests correct number of times');
      equal(server.requests[0].url, 'http://localhost/hostKey',
            'first requests host key');
      equal(server.requests[1].url, 'http://localhost/meta',
            'then meta');
      equal(server.requests[2].url, 'http://localhost/meta',
            'on next attempt, skips to meta');
    }).catch(function(err) {
      ok(false, err);
    }).then(function() {
      start();
    });
  });

  asyncTest('Host key is not JSON', function() {
    testBadHostKey('ghi', // <-- not JSON
      'non-JSON key',
      function(err) {
        ok(err.message.toLowerCase().indexOf('parsererror') === 0,
           'throws parse error for non-JSON host key');
      });
  });

  asyncTest('Host key has bad structure', function() {
    testBadHostKey(JSON.stringify({ k: 'ghi' }), // <-- should be 'key' not 'k'
      'bad structure host key',
      function(err) {
        equal(err.message.toLowerCase(), 'bad host key',
              'throws error for bad structure host key');
      });
  });

  asyncTest('Host key response is empty', function() {
    testBadHostKey(undefined, 'empty host key', function(err) {
        ok(err.message.toLowerCase().indexOf('parsererror') === 0,
           'throws parse error for empty host key');
      });
  });

  function testBadHostKey(keyToUse, description, testFunction) {
    var conn = new SyncConnection({ url: 'http://localhost/',
                                    username: 'abc',
                                    password: 'def' });
    var syncPromise = conn.sync();
    server.requests[0].respond(200,
      { 'Content-Type': 'application/json' }, keyToUse);
    syncPromise.then(function() {
      ok(false, 'error not thrown for ' + description);
    }).catch(function(err) {
      testFunction(err);
      equal(conn.status, 'idle', 'idle status after error');
    }).then(function() {
      start();
    });
  }

  asyncTest('Timeout during host key fetch', function() {
    var conn = new SyncConnection({ url: 'http://localhost/',
                                    username: 'abc',
                                    password: 'def',
                                    timeout: 30 });
    var syncPromise = conn.sync();

    // Wait 40ms (timeout is 30ms)
    window.setTimeout(function() {
      // Then send a response that will generate an error
      // (This way, if timeout is not implemented correctly we will fail but
      // with a different error code. This is easier than producing all the
      // responses needed for the success case and prevents us from accidentally
      // passing due a timeout on a subsequent request.)
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }
        /* no payload = error */);
      syncPromise.then(function() {
        ok(false, 'sync promise should have been rejected');
      }, function(err) {
        equal(conn.status, 'idle', 'returns to idle status after timing out');
        equal(err.message, 'timeout', 'rejected with timeout message');
      }).then(function() {
        start();
      });
    }, 40);
  });

  asyncTest('Bad status codes getting host key', function() {
    var codeMapping = { '403': 'login failed',
                        '404': 'server error',
                        '501': 'upgrade needed',
                        '502': 'server down',
                        '503': 'server busy',
                        '504': 'server busy' },
        conn = new SyncConnection({ url: 'http://localhost/',
                                    username: 'abc',
                                    password: 'def' }),
        sequence = Promise.resolve();

    var testCode = function(code, expectedMessage) {
          sequence.then(function() {
            var syncPromise = conn.sync();
            server.requests[server.requests.length-1].respond(code);
            return syncPromise;
          }).catch(function (err) {
            equal(err.message, expectedMessage,
                  'returns correct message for HTTP code ' + code);
          });
        };

    for (var code in codeMapping) {
      testCode(Number(code), codeMapping[code]);
    }
    sequence.then(function() {
      start();
    });
  });

  asyncTest('Cancel host key fetch', function() {
    var conn = new SyncConnection({ url: 'http://localhost/',
                                    username: 'abc',
                                    password: 'def' });
    var syncPromise = conn.sync();
    conn.cancel();
    equal(conn.status, 'idle', 'goes to idle state after cancelling');

    // Respond to request anyway
    server.requests[0].respond(200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ key: 'ghi' }));

    // Then wait to make sure there's no status change
    waitForStatusChange(conn).then(function() {
      ok(false, 'doesn\'t continue sync');
    }).catch(function(err) {
      ok(err.message, 'No status change', 'status does not change');
    }).then(function() {
      start();
    });

    // Check the sync promise rejects
    syncPromise.then(function() {
      ok(false, 'promise is not resolved');
    }).catch(function(err) {
      equal(err.message, 'abort', 'rejects promise with abort message');
    });
  });

  asyncTest('Get meta summary', function() {
    var conn = new SyncConnection({ url: 'http://localhost/',
                                    username: 'abc',
                                    password: 'def' });
    conn.sync();

    server.requests[0].respond(200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ key: 'ghi' }));
    waitForStatusChange(conn).then(function() {
      var metaReq = server.requests[1];
      equal(metaReq.url, 'http://localhost/meta', 'calls meta URL');
      equal(metaReq.method, 'POST', 'has post method');
      equal(metaReq.requestBody._data.length, 4,
        'has four items in the request');
      deepEqual(metaReq.requestBody._data[0],
                { name: 'c', value: '1', filename: undefined },
                'has correct c chunk');
      deepEqual(metaReq.requestBody._data[1],
                { name: 'k', value: 'ghi', filename: undefined },
                'has correct k chunk');
      var sChunk = metaReq.requestBody._data[2];
      strictEqual(sChunk.name, 's', 'has s chunk');
      ok(/^[a-f0-9]{8}$/.test(sChunk.value), 'has valid client key' +
         ' (got: ' + sChunk.value + ')');
      strictEqual(sChunk.filename, undefined, 's chunk filename is not set');
      var dataChunk = metaReq.requestBody._data[3];
      deepEqual({ name: dataChunk.name, filename: dataChunk.filename },
         { name: 'data', filename: 'data' },
         'data chunk properties set correctly');
      return readBlob(dataChunk.value);
    }).then(function(obj) {
      ok(typeof(obj.v) == 'number' && obj.v > 0, 'has valid sync version');
      ok(/^ankidesktop,[0-9\.]+,\w+:.+?$/.test(obj.cv),
         'has valid client version');
    }).catch(function(err) {
      ok(false, err);
    }).then(function() {
      start();
    });
  });

  // XXX Test overlapping requests
  // XXX Test cancelling at each stage
  // XXX Test cancelling when idle

  // ------------------------------------------------------------------
  // Test helpers
  // ------------------------------------------------------------------

  function MockFormData(form) {
    this._form = form;
    this._data = [];

    this.append = function(name, value, filename) {
      this._data.push({ name: name, value: value, filename: filename});
    };
  }

  // Takes a Blob containing a gzipped JSON string and returns a Promise which
  // is resolved with the corresponding object
  function readBlob(blob) {
    return new Promise(function(resolve, reject) {

      var reader = new FileReader();
      // We'd like to use addEventListener but the version of WebKit in
      // phantomjs only supports onload
      reader.onload = function() {
        try {
          var unzipped = gzip.unzip(new Uint8Array(reader.result));
          var json     = String.fromCharCode.apply(null,
                           Array.prototype.slice.apply(unzipped));
          resolve(JSON.parse(json));
        } catch (e) {
          reject(Error(e));
        }
      };
      reader.onerror = function() {
        reject(Error('Error reading blob'));
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  // Returns a Promise that resolves when the status of the passed in
  // SyncConnection changes.
  function waitForStatusChange(conn) {
    var originalStatus = conn.status;
    var tries = 3;
    return new Promise(function (resolve, reject) {
      var retry = function() {
        if (conn.status != originalStatus) {
          resolve(conn.status);
        }
        if (!--tries) {
          reject(new Error('No status change'));
        }
        window.setTimeout(retry, 0);
      };
      retry();
    });
  }
});
