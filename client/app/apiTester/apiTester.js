'use strict';

angular.module('status2App')
  .config(function ($routeProvider) {
    $routeProvider
      .when('/apiTester', {
        templateUrl: 'app/apiTester/apiTester.html',
        controller: 'ApiTesterCtrl'
      });
  });
