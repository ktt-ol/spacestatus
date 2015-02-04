'use strict';

angular.module('status2App').factory('SSE', function ($log, $q, $http, angularLoad) {

  var isEventSourceSupported = function () {
    if (global.EventSource !== undefined) {
      try {
        var es = new global.EventSource('data:text/event-stream;charset=utf-8,');
        es.close();
        return es.withCredentials === false &&
          es.url !== ''; // to filter out Opera 12 implementation
      } catch (error) {
        return false;
      }
    }
    return false;
  };

  return {
    /**
     * @returns promise
     */
    getEventSource: function () {
      if (isEventSourceSupported) {
        return $q.when();
      } else {
        $log.info('Using eventsource polyfill');
        return angularLoad.loadScript('../bower_components/event-source-polyfill/eventsource.min.js');
      }
    }
  };
});