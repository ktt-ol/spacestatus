'use strict';

var apiUtils = require(('../apiUtils.js'));
var config = require('../../config/environment');
var data = require('../../components/data');
var mqtt = require('../../components/mqtt');
var LOG = require('./../../components/logger/loggerFactory.js').logger();
var PLACES = require('../../common/constants').PLACES;

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    state: { required: true, type: 'string', enum: ['on', 'off', 'closing'] },
    until: { required: false, type: 'integer' }
  }
};

// Get list of openStates
exports.index = function (req, res) {
  apiUtils.sendJson(res, 200, data.state.get().openState);
};

exports.update = function (req, res) {
  var ip = apiUtils.getIpFromRequest(req);
  LOG.debug(ip + ' tries to change status.');

  var place = req.params.place;
  if (PLACES.indexOf(place) === -1) {
    apiUtils.sendJson(res, 400, { status: 'input error', msg: 'Allowed places:' + JSON.stringify(PLACES) });
    return;
  }

  apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
    if (err) {
      return;
    }

    var newState = req.body.state;
    mqtt.setNewStatus(newState, place, function (err) {
      if (err) {
        apiUtils.sendJson(res, 500, { status: 'error', msg: 'Could not update the open state status!' });
        return;
      }

      apiUtils.sendJson(res, 200, { status: 'ok' });
    });


  });


};