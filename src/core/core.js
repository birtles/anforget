/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(['core/sync'], function(SyncConnection) {
  'use strict';

  var conn;

  return {
    sync: function() {
      if (!conn) {
        // XXX Store URL in a config file (and eventually in DB)
        // XXX Store username and password in DB
        conn = new SyncConnection({ url: 'https://localhost/sync/',
                                    username: 'abc',
                                    password: 'def' });
      }
      conn.sync();
    }
  };
});
