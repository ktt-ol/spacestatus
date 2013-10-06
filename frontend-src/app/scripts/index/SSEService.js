(function () {
  'use strict';

  angular.module('status').service('SSE', [
    '$q', '$http', '$window',
    function ($q, $http, $window) {

      return {
        /**
         * @returns promise
         */
        getEventSource: function () {

          var deferred = $q.defer();

          if (typeof (EventSource) === 'function') {
            deferred.resolve();
          } else {
            $http.get('../lib/eventsource.js').
              success(function (data) {
                /*jshint evil:true */
                var script = new Function(data);
                /*jshint evil:false */
                script();
                deferred.resolve();
              }).
              error(function () {
                deferred.reject();
              });
          }
          return deferred.promise;
        }
      };
    }
  ]);
})();