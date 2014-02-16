/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(['jquery', 'gzip', 'promise'], function($, gzip) {
  'use strict';

  // Sync ctor
  return function SyncConnection(server) {
    if (!(this instanceof SyncConnection))
      return new SyncConnection(server);

    var conn = this,
        xhr = null,
        // Strip trailing slash from URL
        serverUrl = (server.url.substr(-1) == '/') ?
                     server.url.substr(0, server.url.length - 1) :
                     server.url,
        timeout = server.timeout || 20 * 1000,
        clientKey = getClientKey(),
        syncVer = 8,
        clientVer = 'ankidesktop,2.0.22,win:Vista';

    conn.status = 'idle';

    conn.sync = function(/*collection, syncLog*/) {
      return new Promise(function(resolve, reject) {
        conn.status = 'logging-in';
        // First get host key
        getHostKey().then(function() {
          conn.status = 'getting-summary';
          return requestMeta();
        }).then(function() {
          resolve(conn);
        }).catch(function(err) {
          conn.status = 'idle';
          reject(err);
        });
      });
    };

    // Returns a Promise that resolves to the host key
    function getHostKey() {
      if (conn.hostKey) {
        return Promise.resolve(conn.hostKey);
      }

      return makeRequest('hostKey', { u: server.username, p: server.password })
        .then(function(response) {
          if (typeof(response) != 'object' ||
              typeof(response.key) != 'string') {
            throw new Error('bad host key');
          }
          conn.hostKey = response.key;
          return conn.hostKey;
        });
    }

    function getClientKey() {
      // This just needs to return an 8-character hex string
      var array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return zeroPad(array[0].toString(16), 8);
    }

    function zeroPad(str, length) {
      if (str.length >= length)
        return str;
      var pad = new Array(length + 1).join('0');
      return (pad + str).slice(-pad.length);
    }

    function requestMeta() {
      return makeRequest('meta', { v: syncVer, cv: clientVer });
    }

    function makeRequest(path, data) {
      var formData = new FormData();
      formData.append('c', '1');

      if (conn.hostKey) {
        formData.append('k', conn.hostKey);
        formData.append('s', clientKey);
      }

      if (data) {
        formData.append('data', makeBlob(data), 'data');
      }

      // HTTP codes with special meaning
      var codeMapping = { '403': 'login failed',
                          '501': 'upgrade needed',
                          '502': 'server down',
                          '503': 'server busy',
                          '504': 'server busy' };

      // Promise.cast won't result in a Promise that producing standard Error
      // objects for the fail case which makes it hard to test.
      // Instead we do the cast manually.
      return new Promise(function(resolve, reject) {
        xhr = $.ajax(serverUrl + '/' + path,
               { type: 'POST',
                 contentType: false,
                 processData: false,
                 data: formData,
                 timeout: timeout
               });
        xhr.then(function(response) {
          resolve(response);
        }).fail(function(jqXHR, textStatus, err) {
          if (typeof(err) === 'object') {
            err.message = textStatus + ': ' + err.message;
            reject(err);
          } else if (typeof(err) === 'string') {
            // Map HTTP status codes
            if (typeof(jqXHR.status) === 'number' && jqXHR.status) {
              if (codeMapping.hasOwnProperty(jqXHR.status.toString())) {
                err = codeMapping[jqXHR.status.toString()];
              } else {
                err = 'server error';
              }
            }
            reject(new Error(err));
          } else {
            reject(new Error(textStatus));
          }
        }).always(function() {
          xhr = null;
        });
      });
    }

    // Makes a blob from object by first JSONifying the object and then
    // gzipping it
    function makeBlob(obj) {
      // Feature testing Blob support is a real pain.
      // - Safari on iOS 6 supports the Blob constructor but with type 'object'
      // - However, Safari 5 also reports typeof(Blob) as 'object' despite not
      //   supporting the Blob constructor or WebKitBlobConstructor.
      // - PhantomJS, however, does not support the Blob constructor but *does*
      //   support WebKitBlobConstructor.
      // - For other platforms which support neither we just fail because using
      //   a polyfill Blob does not produce the correct result when passed to
      //   FormData or FileReader etc.
      var dataArray = new Uint8Array(gzip.zip(JSON.stringify(obj)));

      try {
        // Some versions on WebKit (at least iOS 6 Safari) only allow an
        // ArrayBuffer and not an ArrayBufferView here
        return new Blob([dataArray.buffer]);
      } catch (e) {
        if (typeof(WebKitBlobBuilder) == 'object') {
          var builder = new WebKitBlobBuilder();
          // The version of WebKit in phantomjs doesn't actually allow an
          // ArrayBufferView to be passed into append, only an ArrayBuffer.
          // (If you pass in an ArrayBufferView it doesn't complain but the data
          // is corrupt.)
          builder.append(dataArray.buffer);
          return builder.getBlob();
        } else {
          throw 'No Blob support';
        }
      }
    }

    conn.cancel = function () {
      if (xhr) {
        xhr.abort();
        xhr = null;
        conn.status = 'idle';
      }
    };
  };
});
