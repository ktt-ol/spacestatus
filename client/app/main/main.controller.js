'use strict';
/* global EventSource:false */

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

angular.module('status2App').controller('MainCtrl', function ($scope, $log, $timeout, $window, SSE, StartupChecker) {
  var WIND_DIRECTION = [ 'N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW' ];
  var ENDPOINT = '/api/statusStream?spaceOpen=1&radstelleOpen=1&machining=1&spaceDevices=1&powerUsage=1&freifunk=1&weather=1&mqtt=1';

  var CHECK_INTERVAL = 5 * 60 * 1000;
  var START_FAIL_AFTER = 3 * 1000;

  var lastkeepalive;
  var timestamps = {
    spaceOpen: 0,
    spaceDevices: 0,
    machining: 0,
    freifunk: 0,
    weather: 0,
    energyFront: 0,
    energyBack: 0
  };

  $scope.connectionError = false;
  $scope.startupError = false;
  $scope.isHttp = $window.location.protocol === 'http:';
  $scope.mqtt = {
    connected: false,
    spaceBrokerOnline: true
  };
  $scope.spaceOpen = {
    lastUpdate: '?',
    style: '',
    status: '?'
  };
  $scope.radstelleOpen = {
    lastUpdate: '?',
    style: '',
    status: '?'
  };
  $scope.machining = {
    lastUpdate: '?',
    style: '',
    status: '?'
  };
  $scope.spaceDevices = {
    lastUpdate: '?',
    style: '',
    devices: '?',
    anonPeople: '?',
    who: []
  };
  $scope.energyFront = {
    value: '?',
    lastUpdate: '?'
  };
  $scope.energyBack = {
    value: '?',
    lastUpdate: '?'
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

  $scope.getHttpsUrl = function () {
    return $window.location.href.replace('http://', 'https://');
  };

  var startupCheck = new StartupChecker(function () {
    $scope.startupError = true;
  }, START_FAIL_AFTER);

  function addOpenListener(source, topic) {
    source.addEventListener(topic, function (e) {
      $scope.$apply(function () {
        startupCheck.cancel();
        $scope.startupError = false;

        var data = angular.fromJson(e.data);

        timestamps[topic] = data.timestamp;
        switch (data.state) {
        case 'none':
          $scope[topic].status = 'ZU!';
          $scope[topic].style = 'danger';
          break;
        case 'open':
          $scope[topic].status = 'AUF!';
          $scope[topic].style = 'success';
          break;
        case 'open+':
          $scope[topic].status = 'AUF+!';
          $scope[topic].style = 'success';
          break;
        case 'keyholder':
          $scope[topic].status = 'AUF (Keyholder only!)';
          $scope[topic].style = 'danger';
          break;
        case 'member':
          $scope[topic].status = 'AUF (Member only!)';
          $scope[topic].style = 'danger';
          break;
        case 'closing':
          $scope[topic].status = 'GLEICH ZU!';
          $scope[topic].style = 'warning';
          break;
        }
      });
    }, false);
  }

  function init() {
    $log.info('init EventSource');
    var source = new EventSource(ENDPOINT);
    startupCheck.run();

    source.onopen = function () {
      $scope.$apply(function () {
        $log.log('EventSource is open');
        $scope.connectionError = false;
        lastkeepalive = new Date().getTime();
      });
    };

    source.onerror = function (err) {
      $scope.$apply(function () {
        $scope.connectionError = true;
        startupCheck.cancel();
        $log.error('EventSource error.', err);
      });
    };

    source.addEventListener('mqtt', function (e) {
      $scope.$apply(function () {
        var data = angular.fromJson(e.data);
        $scope.mqtt = data;
      });
    });

    addOpenListener(source, 'spaceOpen');
    addOpenListener(source, 'radstelleOpen');
    addOpenListener(source, 'machining');


    source.addEventListener('spaceDevices', function (e) {
      $scope.$apply(function () {
        var data = angular.fromJson(e.data);

        timestamps.spaceDevices = data.timestamp;
        $scope.spaceDevices.anonPeople = data.peopleCount - data.people.length;
        $scope.spaceDevices.devices = data.unknownDevicesCount;
        $scope.spaceDevices.who = data.people;
      });
    });

    source.addEventListener('powerUsage', function (e) {
      $scope.$apply(function () {
        var data = angular.fromJson(e.data);

        timestamps.energyFront = data.front.timestamp;
        timestamps.energyBack = data.back.timestamp;
        $scope.energyFront.value = data.front.value;
        $scope.energyBack.value = data.back.value;
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

    source.addEventListener('keepalive', function (e) {
      lastkeepalive = new Date().getTime();
    }, false);

    // check whether we have seen a keepalive event within the last 70 minutes or are disconnected; reconnect if necessary
    function checkConnection() {
      $log.log('Checking connection...');
      var now = new Date().getTime();
      if ((now - lastkeepalive > 65 * 60 * 1000) || source.readyState === 2) {
        source.close();
        setTimeout(init, 3000);
        return;
      }
      $timeout(checkConnection, CHECK_INTERVAL, false);
    }

    $timeout(checkConnection, CHECK_INTERVAL, false);
  } // end init

  SSE.getEventSource().then(init);


  function updateLastUpdates() {
    function makeTime(field) {
      if (timestamps[field] > 0) {
        $scope[field].lastUpdate = elapsedTime(timestamps[field]);
      }
    }

    makeTime('spaceOpen');
    makeTime('radstelleOpen');
    makeTime('spaceDevices');
    makeTime('energyFront');
    makeTime('energyBack');
    makeTime('machining');

    $timeout(updateLastUpdates, 1000);
  }

  updateLastUpdates();
});
