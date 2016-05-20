'use strict';
/* global EventSource:false */

angular.module('status2App').controller('SwitchCtrl', function ($scope, $log, $http, $routeParams, $location) {

  var ENDPOINT = '/api/openState';

  $scope.placesList = ['space', 'radstelle'];
  $scope.state = {};

  if (!angular.isUndefined($routeParams.psk)) {
    $routeParams.psk = decodeURIComponent($routeParams.psk);
  }

  $log.debug('pw from url: ', $routeParams.psk);
  $scope.form = {
    psk: $routeParams.psk,
    showPw: !$routeParams.psk
  };

  $scope.updateState = function () {
    $scope.placesList.forEach(function (place) {
      $scope.state[place] = $scope.state[place] || {};
      $scope.state[place].value = '???';
    });

    $scope.error = false;
    $http.get(ENDPOINT).then(function ok(resp) {
      $scope.placesList.forEach(function (place) {
        switch (resp.data[place].state) {
        case 'on':
          $scope.state[place].clazz = 'label-success';
          $scope.state[place].value = 'Offen';
          break;
        case 'off':
          $scope.state[place].clazz = 'label-danger';
          $scope.state[place].value = 'Geschlossen';
          break;
        case 'closing':
          $scope.state[place].clazz = 'label-warning';
          $scope.state[place].value = 'Schließt gleich';
          break;
        }
        // JS expects the ts in ms
        $scope.state[place].ts = resp.data[place].timestamp * 1000;
      });

    }, function error(err) {
      $log.error('error get:', err);
      $scope.error = 'Error getting current server state.';
    });
  };

  $scope.switchTo = function (place, newState) {
    $scope.error = false;

    $scope.state[place].showOk = false;

    $log.info('Setting', place, newState);
    var url = ENDPOINT + '/' + place;
    $http.put(url, {
      'state': newState
    }, {
      headers: {
        'Authorization': $scope.form.psk
      }
    }).then(function ok(resp) {
      $scope.state[place].showOk = true;
      // also get the new state
      $scope.updateState();
    }, function error(err) {
      $log.error('error put:', err);
      $scope.error = 'Error setting new space state! Answer: ' + (err.statusText || '??');
    });
  };

  $scope.pwToUrl = function () {
    $location.path('/switch/' + encodeURIComponent($scope.form.psk));
  };


  $scope.updateState();
});
