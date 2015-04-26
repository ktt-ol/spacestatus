'use strict';
/* global EventSource:false */

angular.module('status2App').controller('SwitchCtrl', function ($scope, $log, $http, $routeParams, $location) {

  var ENDPOINT = '/api/openState';

  $scope.state = {};
  $scope.error = false;
  $scope.showOk = false;

  if (!angular.isUndefined($routeParams.psk)) {
    $routeParams.psk = decodeURIComponent($routeParams.psk);
  }

  $log.debug('pw from url: ', $routeParams.psk);
  $scope.form = {
    psk: $routeParams.psk,
    showPw: !$routeParams.psk
  };

  $scope.updateState = function () {
    $scope.error = false;
    $scope.state = {
      value: '???'
    };
    $http.get(ENDPOINT).then(function ok(resp) {
      switch (resp.data.state) {
      case 'on':
        $scope.state.clazz = 'label-success';
        $scope.state.value = 'Offen';
        break;
      case 'off':
        $scope.state.clazz = 'label-danger';
        $scope.state.value = 'Geschlossen';
        break;
      case 'closing':
        $scope.state.clazz = 'label-warning';
        $scope.state.value = 'Schließt gleich';
        break;
      }
      // JS expects the ts in ms
      $scope.state.ts = resp.data.timestamp * 1000;
    }, function error(err) {
      $log.error('error get:', err);
      $scope.error = 'Error getting current server state.';
    });
  };

  $scope.switchTo = function (newState) {
    $scope.error = false;
    $scope.showOk = false;

    $log.info('Setting', newState);
    $http.put(ENDPOINT, {
      'state': newState
    }, {
      headers: {
        'Authorization': $scope.form.psk
      }
    }).then(function ok(resp) {
      $scope.showOk = true;
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
