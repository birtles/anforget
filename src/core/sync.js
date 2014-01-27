/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(['jquery', 'gzip'], function($, gzip) {
  'use strict';

  // Sync ctor
  return function SyncConnection(server) {
    if (!(this instanceof SyncConnection))
      return new SyncConnection(server);

    // Strip trailing slash from URL
    this.serverUrl = (server.url.substr(-1) == '/') ?
                     server.url.substr(0, server.url.length - 1) :
                     server.url;
 
    this.sync = function (/*collection, syncLog*/) {
      // First get host key if we don't already have one
      // XXX Test that on calling twice hostKey only gets called once
      // XXX Test timeouts
      // XXX Test for all sorts of errors here
      var formData = new FormData();
      formData.append('c', '1');
      var zipped = new Uint8Array(gzip.zip(JSON.stringify(
                      { u: server.username, p: server.password })));
      var data = new Blob([zipped]);
      formData.append('data', data, 'data');

      if (!this.hostKey) {
        $.ajax(this.serverUrl + '/hostKey', {
          type: 'POST',
          contentType: false,
          processData: false,
          data: formData
        }).done(function(key) {
          this.hostKey = key;
          doSync();
        });
      } else {
        doSync();
      }

      function doSync (/*collection, syncLog*/) {
      }
    };

    this.cancel = function () {
      // XXX Write me
    };
  };
});
