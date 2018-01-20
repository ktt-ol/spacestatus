'use strict';

angular.module('status2App').directive('person', function () {

  return {
    // language=HTML
    template: '<span class="name">{{::name}}</span>\n<span class="devices text-muted" ng-if="devices.length > 0">[<small ng-repeat="d in ::devices" ng-class="::d.location" class="location">{{::d.name}}</small>]</span>',
    restrict: 'E',
    scope: {
      p: '&'
    },
    link: function (scope, element, attrs) {
      var p = scope.p();
      scope.name = p.name;

      scope.devices = [];
      if (p.devices) {
        p.devices.forEach(function (device) {
          if (device.name !== '') {
            scope.devices.push(device);
          }
        });
      }
    }
  };
});
