"use strict";

define([], function() {
  // Sync ctor
  return function (username, password) {
    return {
      username: username,
      password: password
    };
  }
});
