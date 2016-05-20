'use strict';

angular.module('status2App', [
  'ngRoute',
  'angularLoad'
])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when('/api/spaceInfo', {
        resolve: {
          redirect: function () {
            window.location.href = '/api/spaceInfo';
          }
        }
      })
      .otherwise({
        redirectTo: '/'
      });

    $locationProvider.html5Mode(true);
  });