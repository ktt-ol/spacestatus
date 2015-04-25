'use strict';

angular.module('status2App')
  .config(function ($routeProvider) {
    $routeProvider
      .when('/switch/:psk?', {
        templateUrl: 'app/switch/switch.html',
        controller: 'SwitchCtrl'
      });
  });
