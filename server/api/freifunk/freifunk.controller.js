'use strict';

var apiUtils = require(('../apiUtils.js'));
var config = require('../../config/environment');
var data = require('../../components/data');
var events = require('../../components/events');

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    client_count: { required: true, type: 'integer', minimum: 1 }
  }
};

// Get list of freifunks
exports.index = function (req, res) {
  apiUtils.sendJson(res, 200, data.state.get().freifunk);
};

// Updtes the Freifunk data. After a successfull update, the 'freifunk' event is published. 'clients_count' must be >= 0
exports.update = function (req, res) {
  apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
    if (err) {
      return;
    }
    var ffState = data.state.get().freifunk;
    ffState.client_count = req.body.client_count;
    ffState.timestamp = Math.round(Date.now() / 1000);

    events.emit(events.EVENT.FREIFUNK, ffState);
    res.send(200, 'ok');
  });

};
