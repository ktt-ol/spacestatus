'use strict';

angular.module('status2App').directive('weeklyStats', function (OpenTimeData, TimeUtils) {

    var MAX_WEEKS = 6;
    var WEEK_DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

    // find the last date except today
    function findStartPosition(chartData) {
      var dayBackCounter = 1;
      var date = 0;
      for (var i = chartData.length - 1; i >= 0; i--) {
        if (date !== chartData[i].date) {
          date = chartData[i].date;
          if (dayBackCounter <= 0) {
            return i;
          }
          dayBackCounter--;
        }
      }
    }

    function decrementDoWP(pointer) {
      // add extra 7 to avoid negative results
      return (pointer - 1 + 7) % 7;
    }

    // use monday instead of sunday as start of week
    function startOfWeekCorrection(dayOfWeek) {
      return (dayOfWeek - 1 + 7) % 7;
    }

    function createWeekStats(chartData, weeks) {
      var i;
      // working on the already prepared chartData

      // go back until we have enough days, specified by "weeks"

      var startPosition = findStartPosition(chartData);
      var lastDate = new Date(chartData[startPosition].date);
      // from 0 to 6; the index of the current day in dayOfWeeks
      var dayOfWeeksPointer = startOfWeekCorrection(lastDate.getDay());

      // monday == 0
      var dayOfWeeks = [ 0, 0, 0, 0, 0, 0, 0 ];
      var lastTs = 0;
      var daysCount = 0;
      for (i = startPosition; i >= 0 && daysCount < weeks * 7; i--) {
        // did we had this day already?
        if (chartData[i].date === lastTs) {
          continue;
        }
        lastTs = chartData[i].date;
        // check for correct day
        if (dayOfWeeksPointer !== startOfWeekCorrection(new Date(chartData[i].date).getDay())) {
          console.log(dayOfWeeksPointer);
          console.log(new Date(chartData[i].date));
          throw new Error('Invalid state!');
        }
        // add total open time for this day
        dayOfWeeks[dayOfWeeksPointer] += chartData[i].durationMs;

        // move the pointer to the previous day
        dayOfWeeksPointer = decrementDoWP(dayOfWeeksPointer);
        daysCount++;
      }

      // create the average by dividing through the amount of weeks
      for (i = 0; i < dayOfWeeks.length; i++) {
        dayOfWeeks[i] /= weeks;
      }

      var totalSum = 0;
      var result = [];
      angular.forEach(dayOfWeeks, function (value, index) {
        totalSum += value;
        var openTime = TimeUtils.getHourFormatBase60(TimeUtils.toHours(value));
        result.push({
          name: WEEK_DAYS[index],
          stat: TimeUtils.formatAsDuration(openTime)
        });
      });
      var totalSumFormatted = TimeUtils.formatAsDuration(TimeUtils.getHourFormatBase60(TimeUtils.toHours(totalSum / 7)));
      result.push({
        name: 'Durchschnitt über alle Tage',
        stat: totalSumFormatted
      });

      return result;
    }

    return {
      templateUrl: 'app/openStats/weeklyStats.directive.html',
      restrict: 'EA',
      link: function (scope, element, attrs) {
        var chartData = [];

        scope.weeks = [];
        for (var i = 1; i <= MAX_WEEKS; i++) {
          scope.weeks.push({
            v: i,
            l: i + ' Wochen'
          });
        }
        scope.week = 1;
        scope.weekStats = [];

        scope.$watch('week', function (newWeek) {
          if (chartData.length > 0) {
            scope.weekStats = createWeekStats(chartData, newWeek);
          }
        });

        OpenTimeData.get().then(
          function (data) {
            window.setTimeout(function () {
              scope.$apply(function () {
                chartData = data;
                scope.weekStats = createWeekStats(chartData, 1);
              });
            });
          });
      }
    };
  }
);