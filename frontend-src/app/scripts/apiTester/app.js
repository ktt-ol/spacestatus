(function () {
  /* global location*/
  /* exported MainCtrl*/

  'use strict';

// every method !== 'GET' is using the Authorization. Use 'auth:true' if you want to have a GET with auth.
  var APIS = [
    {name: '/openState', method: 'PUT', properties: {
      state: { required: true, type: 'string', enum: ['on', 'off', 'closing'] },
      until: { required: false, type: 'integer' }
    }},
    {name: '/openState', method: 'GET'},
    {name: '/spaceDevices', method: 'PUT', properties: {
      devices: { required: true, type: 'array', items: { type: 'string' } }
    }},
    {name: '/spaceDevices', method: 'GET', auth: true },
    {name: '/powerUsage', method: 'PUT', properties: {
      now: { required: true, type: 'integer' },
      lastMinute: { required: false, type: 'integer' }
    }},
    {name: '/powerUsage', method: 'GET' },
    { name: '/twitterAnnouncement', method: 'PUT', properties: {
      enable: { required: true, type: 'boolean' }
    }},
    { name: '/twitterAnnouncement', method: 'GET' },
    { name: '/freifunk', method: 'PUT', properties: {
      client_count: { required: true, type: 'integer', minimum: 1 }
    }},
    { name: '/freifunk', method: 'GET' },
    {name: '/weather', method: 'PUT', properties: {
      Tin: { required: true, type: 'integer' },
      Tout: { required: true, type: 'integer' },
      Hin: { required: true, type: 'integer' },
      Hout: { required: true, type: 'integer' },
      P: { required: true, type: 'integer' },
      Ws: { required: true, type: 'integer' },
      Wg: { required: true, type: 'integer' },
      Wd: { required: true, type: 'integer' },
      R: { required: true, type: 'integer' }
    }},
    {name: '/weather', method: 'GET' },
    {name: '/spaceInfo', method: 'GET', properties: {}, urlParams: []},
    {name: '/statusStream', method: 'GET', properties: {}, urlParams: ['spaceOpen', 'freifunk', 'weather']},
    {name: '/time', method: 'GET'}
  ];

  var app = angular.module('apiTester', []);

  app.controller('MainCtrl', [
    '$scope', '$http', '$window',
    function ($scope, $http, $window) {
      $scope.baseUrl = $window.location.origin + '/api';
      $scope.psk = location.search.length > 1 ? location.search.substr(1) : '';
      $scope.apiCalls = APIS;
      $scope.selectedApi = APIS[0];

      $scope.propValues = {};
      $scope.urlValues = {};
      APIS.forEach(function (api) {
        var propValues = {};

        angular.forEach(api.properties, function (value, key) {
          switch (api.properties[key].type) {
          case 'boolean':
            propValues[key] = false;
            break;
          case 'integer':
            propValues[key] = 0;
            break;
          case 'array':
            propValues[key] = [];
            break;
          default:
            propValues[key] = '';
            break;
          }
        });

        $scope.propValues[api.name] = propValues;

        var urlValues = {};
//      for (i = 0; api.urlParams && i < api.urlParams.length; i++) {
//        urlValues[api.urlParams[i]] = '';
//      }
        $scope.urlValues[api.name] = urlValues;
      });

      $scope.makeRequest = function () {
        $scope.request = '';

        var api = $scope.selectedApi;
        var url = $scope.baseUrl + api.name + buildUrlParameter($scope.urlValues[api.name]);
        var data = $scope.propValues[api.name];

        var resBuffer = api.method + ' ' + url;
        resBuffer += '\nData: ' + angular.toJson(data, true);
        $scope.request = resBuffer;

        $http({
          method: api.method,
          url: url,
          headers: {
            'Authorization': $scope.psk
          },
          data: data
        }).
          success(function (data, status, headers, config) {
            $scope.response = formatResponse(true, status, data);
          }).
          error(function (data, status, headers, config) {
            $scope.response = formatResponse(false, status, data);
          });
      };

      function formatResponse(resultOk, status, data) {
        var buffer = resultOk ? 'Success!' : 'Error!';
        buffer += '\n\nHTTP status: ' + status;
        buffer += '\nData: ' + angular.toJson(data, true);
        return buffer;
      }

      function buildUrlParameter(params) {
        var query = '';
        var first = true;
        angular.forEach(params, function (value, key) {
          query += first ? '?' : '&';
          query += key + '=' + value;
          first = false;
        });

        return query;
      }
    }
  ]);
})();