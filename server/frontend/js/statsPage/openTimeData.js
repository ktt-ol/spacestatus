(function () {
  'use strict';

  var MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

  angular.module('status').service('OpenTimeData', [
    '$q', '$http', 'TimeUtils', 'showGlobalError',
    function ($q, $http, TimeUtils, showGlobalError) {

      function prepareChartData(data) {
        var chartData = [];
        // for every year
        angular.forEach(data.years, function (year, yearIndex) {
          // for every slot (= day)
          angular.forEach(data[year], function (slotEntries, slotIndex) {
            var ts = new Date(year, 0, 1).getTime() + (MILLIS_PER_DAY * slotIndex);
            var tmpData = [];
            var slotDuration = 0;
            // if we don't have any entries for this day, we crate an empty entry
            if (slotEntries.length === 0) {
              chartData.push({
                date: ts,
                open: 0,
                close: 0,
                duration: 0,
                durationMs: 0
              });
            } else {
              // for every open/duration entry
              angular.forEach(slotEntries, function (entry, entryIndex) {
                slotDuration += entry.d;
                var close = entry.b + entry.d;
                tmpData.push({
                  'date': ts,
                  'open': TimeUtils.toHours(entry.b),
                  'close': TimeUtils.toHours(close)
                });
              });
              // add the tmp data to the cart data and add the duration
              angular.forEach(tmpData, function (dataEntry, index) {
                dataEntry.duration = TimeUtils.toHours(slotDuration);
                // for the stats part
                dataEntry.durationMs = slotDuration;
                chartData.push(dataEntry);
              });
            }
          });
        });

        return chartData;
      }

      var srv = {
        _dataPromis: null,

        get: function () {

          if (srv._dataPromis) {
            return srv._dataPromis.promise;
          }

          srv._dataPromis = $q.defer();

          $http.get('/api/openStatistics').then(
            function (resp) {
              var data = resp.data;
              if (!data || !data.years) {
                var err = 'Invalid opentime data.';
                showGlobalError(err);
                srv._dataPromis.reject(err);
                return;
              }

              srv._cache = prepareChartData(data);
              srv._dataPromis.resolve(srv._cache);
            },
            function (resp) {
              var err = 'Error during opentime data request.';
              showGlobalError('err');
              srv._dataPromis.reject(err);
            });

          return srv._dataPromis.promise;
        }
      };


      return srv;
    }
  ]);
})();