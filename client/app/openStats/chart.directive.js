'use strict';

/* global AmCharts */

angular.module('status2App').directive('chart', function (OpenTimeData, TimeUtils) {

    function makeChart(chartData, chartElement) {
      var chart;
      // the last item to hover on (performance optimization for the balloon)
      var lastHoverItem = null;
      var ballonTextCache = '';

      function onRollOver(event) {
        var balloon = event.chart.balloon;
        var item = event.item;
        if (lastHoverItem !== event.index) {
          // data update is needed
          lastHoverItem = event.index;
          balloon.setPosition(event.item.x + 60, event.item.y);

          var total = TimeUtils.getHourFormatBase60(item.values.value);
          ballonTextCache =
            'Geöffnet: ' + TimeUtils.formatAsTime(TimeUtils.getHourFormatBase60(item.values.open)) +
            '<br>Geschlossen: ' + TimeUtils.formatAsTime(TimeUtils.getHourFormatBase60(item.values.close)) +
            '<br>Insgesamt offen: \n' + TimeUtils.formatAsDuration(total);
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
      chart.pathToImages = 'bower_components/amcharts/dist/amcharts/images/';
      chart.autoMarginOffset = 3;
      chart.marginRight = 15;
      chart.zoomOutButton = {
        backgroundColor: '#000000',
        backgroundAlpha: 0.15
      };
      chart.dataProvider = chartData;
      chart.categoryField = 'date';

      // the following two lines makes chart 3D
      chart.depth3D = 10;
      chart.angle = 40;

      // data updated event will be fired when chart is displayed,
      // also when data will be updated. We'll use it to set some
      // initial zoom
      chart.addListener('dataUpdated', zoomChart);

      // AXES
      // Category
      var categoryAxis = chart.categoryAxis;
      categoryAxis.parseDates = true; // in order char to understand dates, we
      // should set parseDates to true
      categoryAxis.minPeriod = 'DD'; // as we have data with minute interval, we
      // have to set 'mm' here.
      categoryAxis.gridAlpha = 0.07;
      categoryAxis.showLastLabel = false;
      categoryAxis.axisColor = '#DADADA';

      // Value
      var valueAxis = new AmCharts.ValueAxis();
      valueAxis.gridAlpha = 0.07;
      valueAxis.maximum = 24;
      valueAxis.title = 'MainFrame open time (hours)';
      chart.addValueAxis(valueAxis);

      // GRAPH
      var graph = new AmCharts.AmGraph();
      // graph.type = 'column';
      graph.type = 'candlestick';
      graph.title = 'red line';

      graph.openField = 'open';
      graph.highField = 'open';
      graph.lowField = 'close';
      graph.closeField = 'close';

      graph.valueField = 'duration';
      graph.lineAlpha = 1;
      graph.lineColor = '#d1cf2a';
      graph.fillAlphas = 0.3; // setting fillAlphas to > 0 value makes it area
      // graph
      graph.showBalloonAt = 'open';
      graph.showBalloon = false;
      chart.addGraph(graph);
      chart.addListener('rollOverGraphItem', onRollOver);
      chart.addListener('rollOutGraphItem', onRollOut);

      // CURSOR
      var chartCursor = new AmCharts.ChartCursor();
      chartCursor.cursorPosition = 'mouse';
      chartCursor.categoryBalloonDateFormat = 'DD MMMM YYYY';
      chart.addChartCursor(chartCursor);

      // SCROLLBAR
      var chartScrollbar = new AmCharts.ChartScrollbar();

      chart.addChartScrollbar(chartScrollbar);

      // WRITE
      chart.write(chartElement[0]);

    }


    return {
      restrict: 'EA',
      link: function (scope, element, attrs) {
        OpenTimeData.get().then(
          function (chartData) {
            makeChart(chartData, element);
          });

      }
    };
  }
);