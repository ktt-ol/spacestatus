/* global EventSource:false */
(function () {
  'use strict';

  var WIND_DIRECTION = [ 'N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW' ];
  var ENDPOINT = '/api/statusStream?spaceOpen=1&spaceDevices=1&freifunk=1&weather=1';

  var app = angular.module('status', []);

  app.controller('StatusCtrl', [
    '$scope', 'SSE', '$timeout',
    function ($scope, SSE, $timeout) {
      var timestamps = {
        openStatus: 0,
        spaceDevices: 0,
        freifunk: 0,
        weather: 0
      };

      $scope.openStatus = {
        lastUpdate: '?',
        style: '',
        status: '?'
      };
      $scope.spaceDevices = {
        lastUpdate: '?',
        style: '',
        devices: '?',
        people: '?',
        who: '?'
      };
      $scope.freifunk = {
        lastUpdate: '?',
        client_count: '?'
      };
      $scope.weather = {
        lastUpdate: '?',
        Tin: '?',
        Tout: '?',
        Hin: '?',
        Hout: '?',
        Wg: '?',
        Wd: '?',
        Ws: '?',
        R: '?',
        P: '?'
      };

      SSE.getEventSource().then(function () {
        var source = new EventSource(ENDPOINT);

        source.onopen = function () {
          //$('.status .listeners').css('background-color', '#4ddb4d');
        };

        source.onerror = function (err) {
          // $('.status .listeners').css('background-color', '#ff5c33');
        };

        source.addEventListener('spaceOpen', function (e) {
          $scope.$apply(function () {
            var data = angular.fromJson(e.data);

            timestamps.openStatus = data.timestamp;
            switch (data.state) {
            case 'off':
              $scope.openStatus.status = 'ZU!';
              $scope.openStatus.style = 'error';
              break;
            case 'on':
              $scope.openStatus.status = 'AUF!';
              $scope.openStatus.style = 'success';
              break;
            case 'closing':
              $scope.openStatus.status = 'GLEICH ZU!';
              $scope.openStatus.style = 'warning';
              break;
            }
          });
        }, false);

        source.addEventListener('spaceDevices', function (e) {
          $scope.$apply(function () {
            var data = angular.fromJson(e.data);

            timestamps.spaceDevices = data.timestamp;
            $scope.spaceDevices.people = data.peopleCount;
            $scope.spaceDevices.devices = data.deviceCount;
            var who = data.people.length > 0 ? data.people.join(', ') : 'Keiner sichtbar';
            $scope.spaceDevices.who = who;
            $scope.spaceDevices.style = data.peopleCount > 0 ? 'success' : 'error';
          });
        });

        source.addEventListener('freifunk', function (e) {
          $scope.$apply(function () {
            var data = angular.fromJson(e.data);

            timestamps.freifunk = data.timestamp;
            $scope.freifunk.client_count = data.client_count;
          });
        });

        source.addEventListener('weather', function (e) {
          $scope.$apply(function () {
            var data = angular.fromJson(e.data);

            timestamps.weather = data.timestamp;
            var w = $scope.weather;
            w.Tin = data.Tin / 10;
            w.Tout = data.Tout / 10;
            w.Hin = data.Hin;
            w.Hout = data.Hout;
            w.Wd = WIND_DIRECTION[data.Wd];
            w.Ws = data.Ws / 10;
            w.Wg = data.Wg / 10;
            w.R = data.R;
            w.P = data.P / 10;
          });
        });

      }); // END SSE

      function updateLastUpdates() {
        function makeTime(field) {
          if (timestamps[field] > 0) {
            $scope[field].lastUpdate = elapsedTime(timestamps[field]);
          }
        }

        makeTime('openStatus');
        makeTime('spaceDevices');
        makeTime('freifunk');
        makeTime('weather');

        $timeout(updateLastUpdates, 1000);
      }

      updateLastUpdates();
    }
  ]
  );


  function elapsedTime(t) {
    var result = '', diff;
    diff = Math.round(Date.now() / 1000) - t;
    if (diff / 86400 >= 1) {
      result += Math.floor(diff / 86400) + 'd';
    }
    diff %= 86400;
    if (diff / 3600 >= 1) {
      result += Math.floor(diff / 3600) + 'h';
    }
    diff %= 3600;
    if (diff / 60 >= 1) {
      result += Math.floor(diff / 60) + 'm';
    }
    diff %= 60;
    result += Math.floor(diff) + 's';
    return result;
  }

  app.service('SSE', [
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
                //noinspection JSHint
                var script = new Function(data);
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
}());