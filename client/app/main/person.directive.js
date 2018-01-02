'use strict';

angular.module('status2App').directive('person', function () {

  return {
    // language=HTML
    template: '<span class="name">{{::name}}</span>\n<span class="devices text-muted" ng-if="devices"><small>{{::devices}}</small></span>',
    restrict: 'E',
    scope: {
      p: '&'
    },
    link: function (scope, element, attrs) {
      var p = scope.p();

      scope.name = p.name;

      var devices = [];
      if (p.devices) {
        p.devices.forEach(function (device) {
          if (device.name !== '') {
            devices.push(device.name);
          }
        });

        if (devices.length > 0) {
          scope.devices = '[' + devices.join(', ') + ']';
        }
      }
    }
  };
});
