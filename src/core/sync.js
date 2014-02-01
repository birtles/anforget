/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(['jquery', 'gzip', 'promise'], function($, gzip) {
  'use strict';

  // Sync ctor
  return function SyncConnection(server) {
    if (!(this instanceof SyncConnection))
      return new SyncConnection(server);

    var conn = this;

    // Strip trailing slash from URL
    var serverUrl = (server.url.substr(-1) == '/') ?
                     server.url.substr(0, server.url.length - 1) :
                     server.url;

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
          // XXX Write test for this first
          // this.status = 'idle';
          reject(err);
        });
      });
    };

    function getHostKey() {
      return new Promise(function(resolve) {
        if (conn.hostKey) {
          resolve(conn.hostKey);
          return;
        }

        var formData = new FormData();
        formData.append('c', '1');
        var data = makeBlob({ u: server.username, p: server.password });
        formData.append('data', data, 'data');

        $.ajax(serverUrl + '/hostKey', {
          type: 'POST',
          contentType: false,
          processData: false,
          data: formData
        }).done(function(key) {
          // XXX Test key is valid
          conn.hostKey = key.key;
          resolve(key.key);
        });
      });
    }

    function requestMeta() {
      return new Promise(function(resolve) {
        var formData = new FormData();
        formData.append('c', '1');
        formData.append('k', conn.hostKey);
        // XXX s = skey
        // XXX version no. etc.

        $.ajax(serverUrl + '/meta', {
          type: 'POST',
          contentType: false,
          processData: false,
          data: formData
        }).done(function() {
          resolve();
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
      // XXX Write me
    };
  };
});
