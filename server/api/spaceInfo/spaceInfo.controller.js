'use strict';

var apiUtils = require(('../apiUtils.js'));
var data = require('../../components/data');

function getPeopleSensor(state) {
  var value = {
    'value': state.spaceDevices.peopleCount
  };
  if (state.spaceDevices.people.length > 0) {
    value.names = state.spaceDevices.people.map(function (peopleObj) {
      return peopleObj.name;
    });
  }

  return [ value ];
}

/**
 * @param {number} timespan in seconds
 */
function formatTimespan(timespan) {
  return timespan + ' sec';
}

// very simple response for our asterisk server
exports.asterisk = function (req, res) {
  var state = data.state.get();
  var spacePart = state.openState.space.state === 'none' ? '0' : '1';
  var radstellePart = state.openState.radstelle.state === 'none' ? '0' : '1';

  res.set({
    'Cache-Control': 'no-cache'
  });
  res.send(spacePart + '-' + radstellePart);
};

// Get list of spaceInfos
exports.index = function (req, res) {

  var state = data.state.get();
  var openStatusPublic = {
    'on': 'Open!',
    'off': 'Closed!',
    'closing': 'We are closing...'
  };

  // https://github.com/slopjong/OpenSpaceLint/issues/80
  // [ 'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW' ]
//      var windDirectionTranslation = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5 ];

  var nowInSeconds = Math.round(Date.now() / 1000);
  var spaceState = state.openState.space;
  var currentStatus = {
    'api': '0.13',
    'space': 'Mainframe',
    'logo': 'http://status.mainframe.io/assets/static/logo.png',
    'url': 'http://mainframe.io/',
    'location': {
      'address': 'Bahnhofsplatz 10, 26122 Oldenburg, Germany',
      'lat': 53.14402,
      'lon': 8.21988
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
      'open': spaceState.state === 'open' || spaceState.state === 'open+',
      'lastchange': spaceState.timestamp,
      'message': openStatusPublic[spaceState.state],
      'icon': {
        'open': 'https://www.kreativitaet-trifft-technik.de/media/img/mainframe-open.svg',
        'closed': 'https://www.kreativitaet-trifft-technik.de/media/img/mainframe-closed.svg'
      }
    },
    'sensors': {
      'people_now_present': getPeopleSensor(state),
      'network_connections': [
        {
          'value': state.spaceDevices.deviceCount,
          'name': 'deviceCount',
          'location': 'Inside'
        }, {
          'value': state.mqtt.spaceBrokerOnline ? 1 : 0,
          'name': 'internetStatus',
          'description': '0: no internet connection, 1: everything is fine'
        }
      ],
      'power_consumption': [
        {
          'name': 'current consumption front',
          'location': 'Hackspace, front',
          'unit': 'W',
          'value': state.powerUsage.front.value,
          'description': 'Value changed ' + formatTimespan(nowInSeconds - state.powerUsage.front.timestamp) + ' ago.'
        },
        {
          'name': 'current consumption back',
          'location': 'Hackspace, back',
          'unit': 'W',
          'value': state.powerUsage.back.value,
          'description': 'Value changed ' + formatTimespan(nowInSeconds - state.powerUsage.back.timestamp) + ' ago.'
        }
      ]
      /* Disabled, until the weather station is running again.
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
       */
    },
    'feeds': {
// No news feed anymore :(
//          'blog': {
//            'type': 'application/rss+xml',
//            'url': 'http://www.kreativitaet-trifft-technik.de/news.xml'
//          },
      'calendar': {
        'type': 'application/calendar',
        'url': 'https://www.kreativitaet-trifft-technik.de/calendar/ical/markusframer@gmail.com/public/basic.ics'
      }
    },
    'projects': [
      'https://github.com/ktt-ol/'
    ]
  };

  apiUtils.sendJson(res, 200, currentStatus);
};