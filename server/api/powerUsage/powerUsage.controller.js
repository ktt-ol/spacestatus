'use strict';

var express = require('express');
var config = require('../../config/environment');
var data = require('../../components/data');
var events = require('../../components/events');
var apiUtils = require(('../apiUtils.js'));

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    now: { required: true, type: 'integer' },
    lastMinute: { required: false, type: 'integer' }
  }
};

exports.index = function(req, res) {
  apiUtils.sendJson(res, 200, data.state.get().powerUsage);
};

exports.update = function(req, res) {
  apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
    if (err) {
      return;
    }

    var powerUsageState = data.state.get().powerUsage;
    powerUsageState.now = req.body.now;
    powerUsageState.lastMinute = req.body.lastMinute;
    powerUsageState.timestamp = Math.round(Date.now() / 1000);

    events.emit(events.EVENT.POWER_USAGE, powerUsageState);

    apiUtils.sendJson(res, 200, { status: 'ok' });
  });
};