(function () {
  'use strict';

  angular.module('status').service('TimeUtils', [
    function () {

      return {
        toHours: function (ms) {
          return (ms / 1000 / 60 / 60).toFixed(2);
        },

        formatAsTime: function (hourFormatBase60) {
          return hourFormatBase60.h + ':' + hourFormatBase60.m + ' Uhr';
        },

        formatAsDuration: function (hourFormatBase60) {
          return hourFormatBase60.h + ' Stunden, ' + hourFormatBase60.m + ' Minuten.';
        },

        getHourFormatBase60: function (/* floating point */hour) {
          var hourValue = parseInt(hour, 10).toString();
          if (hourValue.length === 1) {
            hourValue = '0' + hourValue;
          }
          var minutePart = ((hour * 100) % 100);
          var minuteValue = parseInt(minutePart * 60 / 100, 10).toString();
          if (minuteValue.length === 1) {
            minuteValue = '0' + minuteValue;
          }
          return {
            h: hourValue,
            m: minuteValue
          };
        }

      };
    }
  ]);

})();