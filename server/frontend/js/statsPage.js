$(function() {
  'use strict';
  
  var MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
  var WEEK_DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  
  var chart = null, chartData = [];
  // the last item to hover on (performance optimization for the balloon)
  var lastHoverItem = null;
  var ballonTextCache = '';

  $.getJSON('/api/openStatistics', function(data) {
    if (!data || !data.years) {
      $('#globalError').html('Could not load graph data.').show();
      console.log(data);
      return;
    }

    createChartData(data);
    makeChart();
    initStats();
  });

  function initStats() {
    var WEEKS = 5;
    var select = $('#weeklyStatsDropdown');
    for ( var i = 2; i < WEEKS + 2; i++) {
      select.append('<option value="' + i + '">' + i + ' Wochen</option>');
    }
    select.change(function() {
      showWeekStats(this.value);
    });

    showWeekStats(1);
  }

  function showWeekStats(weeks) {
    // working on the already prepared chartData
    
    // find the last date except today
    function findStartPosition(chartData) {
      var dayBackCounter = 1;
      var date = 0;
      for ( var i = chartData.length - 1; i >= 0; i--) {
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

    
    // go back until we have enough days, specified by "weeks"

    var startPosition = findStartPosition(chartData);
    var lastDate = new Date(chartData[startPosition].date);
    // from 0 to 6; the index of the current day in dayOfWeeks
    var dayOfWeeksPointer = startOfWeekCorrection(lastDate.getDay());
    
    // monday == 0
    var dayOfWeeks = [ 0, 0, 0, 0, 0, 0, 0 ];
    var lastTs = 0;
    var daysCount = 0;
    for ( var i = startPosition; i >= 0 && daysCount < weeks * 7; i--) {
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
    for ( var i = 0; i < dayOfWeeks.length; i++) {
      dayOfWeeks[i] /= weeks;
    }

    var table = $('#weeklyStatsTable');
    var tbody = $('tbody', table);
    tbody.empty();

    var totalSum = 0;
    $.each(dayOfWeeks, function(index, value) {
      totalSum += value;
      var openTime = getHourFormatBase60(toHours(value));
      tbody.append('<tr><td>' + WEEK_DAYS[index] + '</td><td>' + formatAsDuration(openTime) + '</td></tr>');
    });
    var totalSumFormatted = formatAsDuration(getHourFormatBase60(toHours(totalSum / 7)));
    tbody.append('<tr><td>Durchschnitt über alle Tage</td><td>' + totalSumFormatted  + '</td></tr>');

  }

  function createChartData(data) {
    chartData = [];
    // for every year
    $.each(data.years, function(yearIndex, year) {
      // for every slot (= day)
      $.each(data[year], function(slotIndex, slotEntries) {
        var ts = new Date(year, 0, 1).getTime() + (MILLIS_PER_DAY * slotIndex);
        var tmpData = [];
        var slotDuration = 0;
        // if we don't have any entries for this day, we crate an empty entry
        if (slotEntries.length === 0) {
          chartData.push({
            date : ts,
            open : 0,
            close : 0,
            duration : 0,
            durationMs : 0
          });
        } else {
          // for every open/duration entry
          $.each(slotEntries, function(entryIndex, entry) {
            slotDuration += entry.d;
            var close = entry.b + entry.d;
            tmpData.push({
              'date' : ts,
              'open' : toHours(entry.b),
              'close' : toHours(close),
            });
          });
          // add the tmp data to the cart data and add the duration
          $.each(tmpData, function(index, dataEntry) {
            dataEntry['duration'] = toHours(slotDuration);
            // for the stats part
            dataEntry['durationMs'] = slotDuration;
            chartData.push(dataEntry);
          });
        }
      });
    });
  }

  function toHours(ms) {
    return (ms / 1000 / 60 / 60).toFixed(2);
  }

  function makeChart() {
    function onRollOver(event) {
      var balloon = event.chart.balloon;
      var item = event.item;
      if (lastHoverItem !== event.index) {
        // data update is needed
        lastHoverItem = event.index;
        balloon.setPosition(event.item.x, event.item.y);

        var total = getHourFormatBase60(item.values.value);
        ballonTextCache = 'Geöffnet: ' + formatAsTime(getHourFormatBase60(item.values.open)) + '\nGeschlossen: '
            + formatAsTime(getHourFormatBase60(item.values.close)) + '\nInsgesamt offen: \n' + formatAsDuration(total);
      }
      balloon.showBalloon(ballonTextCache);
    }
    function onRollOut(event) {
    }
    function zoomChart() {
      // different zoom methods can be used - zoomToIndexes, zoomToDates,
      // zoomToCategoryValues
      chart.zoomToIndexes(chartData.length - 40, chartData.length - 1);
    }
    
    chart = new AmCharts.AmSerialChart();
    chart.pathToImages = "img/amstats/";
    chart.autoMarginOffset = 3;
    chart.marginRight = 15;
    chart.zoomOutButton = {
      backgroundColor : '#000000',
      backgroundAlpha : 0.15
    };
    chart.dataProvider = chartData;
    chart.categoryField = "date";

    // the following two lines makes chart 3D
    // chart.depth3D = 10;
    // chart.angle = 40;

    // data updated event will be fired when chart is displayed,
    // also when data will be updated. We'll use it to set some
    // initial zoom
    chart.addListener("dataUpdated", zoomChart);

    // AXES
    // Category
    var categoryAxis = chart.categoryAxis;
    categoryAxis.parseDates = true; // in order char to understand dates, we
    // should set parseDates to true
    categoryAxis.minPeriod = "DD"; // as we have data with minute interval, we
    // have to set "mm" here.
    categoryAxis.gridAlpha = 0.07;
    categoryAxis.showLastLabel = false;
    categoryAxis.axisColor = "#DADADA";

    // Value
    var valueAxis = new AmCharts.ValueAxis();
    valueAxis.gridAlpha = 0.07;
    valueAxis.maximum = 24;
    valueAxis.title = "MainFrame open time (hours)";
    chart.addValueAxis(valueAxis);

    // GRAPH
    var graph = new AmCharts.AmGraph();
    // graph.type = "column";
    graph.type = "candlestick";
    graph.title = "red line";

    graph.openField = "open";
    graph.highField = "open";
    graph.lowField = "close";
    graph.closeField = "close";

    graph.valueField = "duration";
    graph.lineAlpha = 1;
    graph.lineColor = "#d1cf2a";
    graph.fillAlphas = 0.3; // setting fillAlphas to > 0 value makes it area
    // graph
    graph.showBalloonAt = 'open';
    graph.showBalloon = false;
    chart.addGraph(graph);
    chart.addListener('rollOverGraphItem', onRollOver);
    chart.addListener('rollOutGraphItem', onRollOut);

    // CURSOR
    var chartCursor = new AmCharts.ChartCursor();
    chartCursor.cursorPosition = "mouse";
    chartCursor.categoryBalloonDateFormat = "DD MMMM YYYY";
    chart.addChartCursor(chartCursor);

    // SCROLLBAR
    var chartScrollbar = new AmCharts.ChartScrollbar();

    chart.addChartScrollbar(chartScrollbar);

    // WRITE
    chart.write("chartdiv");
  }

  function getHourFormatBase60(/* floating point */hour) {
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
      h : hourValue,
      m : minuteValue
    };
  }

  function formatAsTime(hourFormatBase60) {
    return hourFormatBase60.h + ':' + hourFormatBase60.m + ' Uhr';
  }
  
  function formatAsDuration(hourFormatBase60) {
    return hourFormatBase60.h + ' Stunden, ' + hourFormatBase60.m + ' Minuten.';
  }

  
});