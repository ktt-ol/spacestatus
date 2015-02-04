'use strict';

angular.module('status2App', [
  'ngRoute',
  'angularLoad'
])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .otherwise({
        redirectTo: '/'
      });

    $locationProvider.html5Mode(true);
  });