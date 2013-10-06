(function () {
  'use strict';

  angular.module('status-extras', []).controller('NavMenuCtrl', [
    '$scope',
    function ($scope) {
      $scope.data = {
        open: false,
        navStyle: {}
      };

      $scope.respButtonClick = function () {
        $scope.data.open = !$scope.data.open;
        $scope.data.navStyle = $scope.data.open ? { 'height': 'auto' } : {};
      };
    }
  ]);
})();