/*
 This page outputs information for the Space Api ( http://spaceapi.net/ ).
 Mostly static information, however the open state and the sensor properties are dynamic.

 http://spaceapi.net/specs/0.13
 */

'use strict';

var apiUtils = require(('./apiUtils.js'));

module.exports = function (app, data, config, srv) {

  function getPeopleSensor(state) {
    var value = {
      'value': state.spaceDevices.peopleCount
    };
    if (state.spaceDevices.people.length > 0) {
      value.names = state.spaceDevices.people;
    }

    return [ value ];
  }

  app.namespace('/spaceInfo', function () {

    app.get('/', function (req, res) {

      var state = data.state.get();
      var openStatusPublic = {
        'on': 'Open!',
        'off': 'Closed!',
        'closing': 'We are closing...'
      };

      // https://github.com/slopjong/OpenSpaceLint/issues/80
      // [ 'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW' ]
      var windDirectionTranslation = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5 ];


      var currentStatus = {
        'api': '0.13',
        'space': 'Mainframe',
        'logo': 'http://status.mainframe.io/img/logo.png',
        'url': 'http://mainframe.io/',
        'location': {
          'address': 'Raiffeisenstrasse 27, 26122 Oldenburg, Germany',
          'lat': 53.14495,
          'lon': 8.21516
        },
        'contact': {
          'irc': 'irc://freenode/#hsol',
          'twitter': '@HackspaceOL',
          'email': 'vorstand@kreativitaet-trifft-technik.de',
          'ml': 'diskussion@kreativitaet-trifft-technik.de',
          'issue_mail': 'hc@kreativitaet-trifft-technik.de'
        },
        'issue_report_channels': [ 'issue_mail'],
        'state': {
          'open': state.status.state === 'on',
          'lastchange': state.status.timestamp,
          'message': openStatusPublic[state.status.state],
          'icon': {
            'open': 'http://status.mainframe.io/img/open.png',
            'closed': 'http://status.mainframe.io/img/closed.png'
          }
        },
        'sensors': {
          'people_now_present': getPeopleSensor(state),
          'network_connections': [
            {
              'value': state.spaceDevices.deviceCount,
              'location': 'Inside'
            }
          ],
          'temperature': [
            {
              'location': 'Inside',
              'value': state.weather.Tin / 10,
              'unit': '°C'
            },
            {
              'location': 'Outside',
              'value': state.weather.Tout / 10,
              'unit': '°C'
            }
          ],

          'humidity': [
            {
              'location': 'Inside',
              'value': state.weather.Hin / 100,
              'unit': '%'
            },
            {
              'location': 'Outside',
              'value': state.weather.Hout / 100,
              'unit': '%'
            }
          ],

          'barometer': [
            {
              'location': 'Outside',
              'value': state.weather.P / 10,
              'unit': 'hPA'
            }
          ],

          'wind': [
            {
              'location': 'Outside',
              'properties': {
                'speed': {
                  'value': state.weather.Ws / 10,
                  'unit': 'm/s'
                },
                'gust': {
                  'value': state.weather.Ws / 10,
                  'unit': 'm/s'
                },
                'direction': {
                  'value': windDirectionTranslation[state.weather.Wd],
                  'unit': '\u00b0'
                },
                'elevation': {
                  // 7.701 m + the buildings roof (ca. 20m)
                  'value': 27,
                  'unit': 'm'
                }
              }
            }
          ]
        },
        'feeds': {
          'blog': {
            'type': 'application/rss+xml',
            'url': 'http://www.kreativitaet-trifft-technik.de/news.xml'
          },
          'calendar': {
            'type': 'application/calendar',
            'url': 'http://www.kreativitaet-trifft-technik.de/calendar/ical/2013-05/calendar.ics'
          }
        },
        'projects': [
          'https://github.com/ktt-ol/'
        ]
      };

      apiUtils.sendJson(res, 200, currentStatus);

    }); // end get
  });
};

