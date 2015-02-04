'use strict';

var apiUtils = require(('../apiUtils.js'));
var config = require('../../config/environment');
var data = require('../../components/data');
var events = require('../../components/events');
var twitter = require('../../components/twitter');
var xmpp = require('../../components/xmpp');
var LOG = require('./../../components/logger/loggerFactory.js').logger();

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    state: { required: true, type: 'string', enum: ['on', 'off', 'closing'] },
    until: { required: false, type: 'integer' }
  }
};

// Get list of openStates
exports.index = function(req, res) {
  apiUtils.sendJson(res, 200, data.state.get().status);
};

exports.update = function (req, res) {

  var ip = apiUtils.getIpFromRequest(req);
  LOG.debug(ip + ' tries to change status.');

  apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
    if (err) {
      return;
    }

    var newState = req.body.state;
    data.db.updateOpenState(newState, function (err) {
      if (err) {
        apiUtils.sendJson(res, 500, { status: 'error', msg: 'Could not upate the open state status!' });
        return;
      }

      var status = data.state.get().status;
      status.state = newState;
      status.timestamp = Math.round(Date.now() / 1000);
//          if (req.body.until > 0) {
//            status.until = req.body.until;
//          }
      LOG.info('Change the status to: ' + newState);

      twitter.sendTwitterForSpaceStatus(newState);
      xmpp.updateForSpaceStatus(newState);

      events.emit(events.EVENT.SPACE_OPEN, status);

      apiUtils.sendJson(res, 200, { status: 'ok' });
    });

  });

};