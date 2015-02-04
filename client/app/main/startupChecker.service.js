'use strict';

angular.module('status2App').factory('StartupChecker', function ($timeout) {

  function StartupChecker(startupFailedCallback, failAfter) {
    var running = false;
    var timeout;

    function onTimeout() {
      if (!running) return;
      startupFailedCallback();
      running = false;
    }

    this.run = function () {
      this.cancel();

      running = true;
      timeout = $timeout(onTimeout, failAfter);
    };

    this.cancel = function () {
      if (!running) return;

      $timeout.cancel(timeout);
      running = false;
    };
  }

  return StartupChecker;
});