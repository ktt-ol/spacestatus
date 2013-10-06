(function () {
  'use strict';

  var app = angular.module('status', ['status-extras']);

  app.factory('showGlobalError', [
    '$rootScope',
    function ($rootScope) {
      return function (msg, excp) {
        $rootScope.globalErrorMsg = $rootScope.globalErrorMsg || [];
        $rootScope.globalErrorMsg.push(msg);
        if (excp) {
          console.error(excp);
        }
      };
    }
  ]);
})();