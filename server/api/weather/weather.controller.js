'use strict';

var config = require('../../config/environment');
var data = require('../../components/data');
var events = require('../../components/events');
var apiUtils = require(('../apiUtils.js'));

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    Tin: { required: true, type: 'integer' },
    Tout: { required: true, type: 'integer' },
    Hin: { required: true, type: 'integer' },
    Hout: { required: true, type: 'integer' },
    P: { required: true, type: 'integer' },
    Ws: { required: true, type: 'integer' },
    Wg: { required: true, type: 'integer' },
    Wd: { required: true, type: 'integer' },
    R: { required: true, type: 'integer' }
  }
};


exports.index = function(req, res) {
  apiUtils.sendJson(res, 200, data.state.get().weather);
};

exports.update = function (req, res) {
  apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
    if (err) {
      return;
    }
    var weatherState = data.state.get().weather;
    var keys = Object.keys(SCHEME.properties);
    for (var i = 0; i < keys.length; i++) {
      var weatherKey = keys[i];
      weatherState[weatherKey] = req.body[weatherKey];
    }
    weatherState.timestamp = Math.round(Date.now() / 1000);

    events.emit(events.EVENT.WEATHER, weatherState);
    res.send(200, 'ok');
  });
};