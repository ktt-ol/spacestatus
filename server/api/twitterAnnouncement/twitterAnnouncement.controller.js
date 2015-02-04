'use strict';

var config = require('../../config/environment');
var twitter = require('../../components/twitter');
var apiUtils = require(('../apiUtils.js'));

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    enable: { required: true, type: 'boolean' }
  }
};


// Get list of twitterAnnouncements
exports.index = function(req, res) {
  apiUtils.sendJson(res, 200, { enabled: twitter.isEnabled() } );
};

exports.update = function (req, res) {
  apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
    if (err) {
      return;
    }

    if (req.body.enable) {
      twitter.enable();
    } else {
      twitter.disable();
    }
    apiUtils.sendJson(res, 200, { status: 'ok' });
  });
};