'use strict';

angular.module('status2App')
  .controller('NavbarCtrl', function ($scope, $location) {
    $scope.menu = [
      {
        'title': 'Status',
        'link': '/'
      },
      {
        'title': 'Öffnungsstatistiken',
        'link': '/openStats'
      }
    ];

    $scope.isCollapsed = true;

    $scope.isActive = function (route) {
      return route === $location.path();
    };
  });