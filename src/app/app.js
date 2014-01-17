/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(['core/core', 'jquery'], function(Anforget) {
  'use strict';

  function init() {
    console.log('init!');
    console.log(Anforget);
  }

  return {
    init: init
  };
});
