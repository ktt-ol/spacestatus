/*
 Mostly static information about the Hackspace. The open state and the weather data is used as dynamic part.
 For external site.
 */

'use strict';

var apiUtils = require(('./apiUtils.js'));

module.exports = function (app, data, config, srv) {

  app.namespace('/spaceInfo', function () {

    app.get('/', function (req, res) {

      var state = data.state.get();
      var openStatusPublic = {
        'on': 'Open!',
        'off': 'Closed!',
        'closing': 'Closing...'
      };


      var currentStatus = {
        'api': '0.12',
        'space': 'Mainframe',
        'logo': 'http://status.kreativitaet-trifft-technik.de/img/logo.png',
        'icon': {
          'open': 'http://status.kreativitaet-trifft-technik.de/img/open.png',
          'closed': 'http://status.kreativitaet-trifft-technik.de/img/closed.png'
        },
        'url': 'http://www.kreativitaet-trifft-technik.de/',
        'address': 'Raiffeisenstrasse 27, 26122 Oldenburg, Germany',
        'contact': {
          'irc': 'irc://freenode/#hsol',
          'twitter': '@HackspaceOL',
          'email': 'vorstand@kreativitaet-trifft-technik.de',
          'ml': 'diskussion@kreativitaet-trifft-technik.de'
        },
        'lat': 53.14495,
        'lon': 8.21516,
        'open': state.status.state === 'on',
        'status': openStatusPublic[state.status.state],
        'lastchange': state.status.timestamp,
        'sensors': {
          'temperature': [
            {
              'name': 'inside',
              'value': state.weather.Tin / 10,
              'unit': 'C'
            },
            {
              'name': 'outside',
              'value': state.weather.Tout / 10,
              'unit': 'C'
            }
          ],

          'humidity': [
            {
              'name': 'inside',
              'value': state.weather.Hin / 100
            },
            {
              'name': 'outside',
              'value': state.weather.Hout / 100
            }
          ],

          'barometer': [
            {
              'name': 'outside',
              'value': state.weather.P / 10,
              'unit': 'hPa'
            }
          ],

          'wind': [
            {
              'name': 'outside',
              'speed': state.weather.Ws / 10,
              'gust': state.weather.Wg / 10,
              'unit': 'm/s',
              'direction': [ 'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW' ][state.weather.Wd]
            }
          ],

          'wifi': [
            {
              'name': 'freifunk',
              'connections': state.freifunk.client_count
            }
          ]
        },
        'feeds': [
          {
            'name': 'blog',
            'type': 'application/rss+xml',
            'url': 'http://www.kreativitaet-trifft-technik.de/news.xml'
          },
          {
            'name': 'calendar',
            'type': 'application/calendar',
            'url': 'http://www.kreativitaet-trifft-technik.de/calendar/ical/2013-05/calendar.ics'
          },
          {
            'name': 'status',
            'type': 'text/html',
            'url': 'http://status.kreativitaet-trifft-technik.de/'
          }
        ]
      };

      apiUtils.sendJson(res, 200, currentStatus);

    }); // end get
  });
};

