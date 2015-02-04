'use strict';

angular.module('status2App').config(function ($routeProvider) {

  var loadScripts = ['$q', 'angularLoad', function ($q, angularLoad) {
    return [
      'bower_components/amcharts/dist/amcharts/amcharts.js',
      'bower_components/amcharts/dist/amcharts/serial.js'
    ].reduce(function (previousPromise, scriptUrl) {
        return previousPromise.then(function () {
          return angularLoad.loadScript(scriptUrl);
        });
      }, $q.when());
  }];

  $routeProvider
    .when('/openStats', {
      templateUrl: 'app/openStats/openStats.html',
      controller: 'OpenStatsCtrl',
      resolve: {
        'loadScripts': loadScripts
      }
    });
});
