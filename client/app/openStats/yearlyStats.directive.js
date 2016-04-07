'use strict';

angular.module('status2App').directive('yearlyStats', function (OpenTimeData, TimeUtils) {

  // we started on 23.02.2012
  var DAYS_FIRST_YEAR = 365 - 54;
  var START_YEAR = 2012;
  var YEAR_TODAY = new Date().getFullYear();

  /**
   * Creates the stats per the given year
   * @param openTimeData
   * @param year
   * @param daysToUse
   * @returns {{year: *, hoursTotal: number, hoursPerDay: number}}
   */
  function createStats(openTimeData, year, daysToUse) {
    var yearBegin = new Date(year, 0).getTime();
    var yearEnd = new Date(year + 1, 0).getTime();

    var yearSum = 0;
    var lastTs = 0;
    for (var i = 0; i < openTimeData.length; i++) {
      if (openTimeData[i].date < yearBegin) {
        continue;
      }
      if (openTimeData[i].date >= yearEnd) {
        break;
      }
      if (openTimeData[i].date === lastTs) {
        continue;
      }
      // console.log(new Date(data[i].date));
      lastTs = openTimeData[i].date;
      yearSum += openTimeData[i].durationMs;
    }

    var hoursTotal = yearSum / 1000 / 60 / 60;
    return {
      year: year,
      hoursTotal: Math.round(hoursTotal),
      hoursPerDay: parseFloat(hoursTotal / daysToUse).toFixed(2)
    };
  }

  // gets the amount of days in this year until now
  function daysUntilNow() {
    var begin = new Date(YEAR_TODAY, 0).getTime();
    var end = Date.now();

    return Math.floor((end - begin) / 1000 / 60 / 60 / 24);
  }

  return {
    templateUrl: 'app/openStats/yearlyStats.directive.html',
    restrict: 'EA',
    link: function (scope, element, attrs) {

      scope.yearStats = [];

      OpenTimeData.get().then(function ok(openTimeData) {
        for (var y = YEAR_TODAY; y >= START_YEAR; y--) {
          var daysToUse = 365;
          if (y === START_YEAR) {
            daysToUse = DAYS_FIRST_YEAR;
          } else if (y === YEAR_TODAY) {
            daysToUse = daysUntilNow();
          }
          scope.yearStats.push(createStats(openTimeData, y, daysToUse));
        }
      });

    }
  };

});
