/* global $: false, document: false, EventSource:false */

'use strict';

function elapsedTime(t) {
  var result = '', diff;
  diff = Math.round(Date.now() / 1000) - t;
  if (diff / 86400 >= 1) {
    result += Math.floor(diff / 86400) + 'd';
  }
  diff %= 86400;
  if (diff / 3600 >= 1) {
    result += Math.floor(diff / 3600) + 'h';
  }
  diff %= 3600;
  if (diff / 60 >= 1) {
    result += Math.floor(diff / 60) + 'm';
  }
  diff %= 60;
  result += Math.floor(diff) + 's';
  return result;
}

var timestamps = {
  'ff': 0,
  'listeners': 0,
  'weather': 0,
  'status': 0
};

setInterval(function () {
  if (timestamps.ff !== 0) {
    $('.lastupdateff').text(elapsedTime(timestamps.ff));
  }
  if (timestamps.spaceDevices !== 0) {
    $('.lastupdatespaceDevices').text(elapsedTime(timestamps.spaceDevices));
  }
  if (timestamps.weather !== 0) {
    $('.lastupdateweather').text(elapsedTime(timestamps.weather));
  }
  if (timestamps.status !== 0) {
    $('.lastupdate').text(elapsedTime(timestamps.status));
  }
}, 1000);

function onDomReady() {
  var source = new EventSource('/api/statusStream?spaceOpen=1&spaceDevices=1&freifunk=1&weather=1');
  var lastkeepalive = +new Date();

  source.onopen = function () {
    $('.status .listeners').css('background-color', '#4ddb4d');
  };

  source.onerror = function (err) {
    $('.status .listeners').css('background-color', '#ff5c33');
  };

  source.addEventListener('spaceOpen', function (e) {
    function updateBox(text, color, until) {
      $('.status .mainstatus .mainstatus').text(text);
      $('.status .mainstatus').css('background-color', color);
      $('.status .until').text(until);
    }

    var data = $.parseJSON(e.data);
    switch (data.state) {
    case 'off':
      updateBox('ZU!', '#ff5c33', '');
      break;
    case 'on':
      updateBox('AUF!', '#4ddb4d', '');
      break;
    case 'closing':
      var until = '';
//      var ud = new Date(data.until * 1000);
//      if (data.until > 0) {
//        until = 'Bis ' + ud.getHours() + ':' + (ud.getMinutes() < 10 ? '0' : '') + ud.getMinutes() + ' Uhr';
//      }
      updateBox('GLEICH ZU!', '#F89238', until);
      break;
    }
    timestamps.status = data.timestamp;
  }, false);

  source.addEventListener('spaceDevices', function (e) {
    var data = $.parseJSON(e.data);

    var text = data.peopleCount + ' + ' + data.deviceCount;
    var title = data.people.length > 0 ? data.people.join(', ') : 'No public people';
    $('#pis').text(text).attr('title', title);
    timestamps.spaceDevices = data.timestamp;
  }, false);

  source.addEventListener('freifunk', function (e) {
    var ff = $.parseJSON(e.data);
    $('.status .ff .ff').text(ff.client_count);
    timestamps.ff = ff.timestamp;
  }, false);

  function tempcolor(t) {
    var result = t < 0 ? '#0066ff' : t < 100 ? '#75a3ff' : t < 200 ? '#9966cc' : t < 300 ? '#ffcc00' : '#ff6600';
    return result;
  }

  source.addEventListener('weather', function (e) {
    var weather = $.parseJSON(e.data);
    var Wds = [ 'N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW' ];
    timestamps.weather = weather.timestamp;
    $('.Tin').html(weather.Tin / 10 + '&deg;');
    $('.Tout').html(weather.Tout / 10 + '&deg;');
    $('.Hin').text(weather.Hin + '%');
    $('.Hout').text(weather.Hout + '%');
    $('.Wg').text(weather.Wg / 10 + ' m/s');
    $('.Wd').text(Wds[weather.Wd]);
    $('.Ws').text(weather.Ws / 10 + ' m/s');
    $('.R').text(weather.R);
    $('.P').text(weather.P / 10 + ' hPa');
    $('.weatherin').css('background-color', tempcolor(weather.Tin));
    $('.weatherout').css('background-color', tempcolor(weather.Tout));
  }, false);

  source.addEventListener('keepalive', function (e) {
    lastkeepalive = +new Date();
  }, false);

  // check whether we have seen a keepalive event within the last 70 minutes or are disconnected; reconnect if necessary
  var checkinterval = setInterval(function () {
    if ((new Date() - lastkeepalive > 65 * 60 * 1000) || source.readyState === 2) {
      source.close();
      clearInterval(checkinterval);
      setTimeout(onDomReady, 1000);
    }
  }, 5 * 60 * 1000);
}

if (typeof (EventSource) === 'function') {
  document.addEventListener('DOMContentLoaded', onDomReady, false);
} else {
  $.getScript('../lib/eventsource.js', function () {
    onDomReady();
  });
}
