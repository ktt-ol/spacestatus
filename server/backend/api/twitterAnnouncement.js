'use strict';

var apiUtils = require(('./apiUtils.js'));

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    enable: { required: true, type: 'boolean' }
  }
};

module.exports = function (app, data, config, srv) {
  app.namespace('/twitterAnnouncement', function () {

    app.get('/', function (req, res) {
      apiUtils.sendJson(res, 200, { enabled: srv.twitter.isEnabled() } );
    });

    app.put('/', function (req, res) {
      apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
        if (err) {
          return;
        }

        if (req.body.enable) {
          srv.twitter.enable();
        } else {
          srv.twitter.disable();
        }
        apiUtils.sendJson(res, 200, { status: 'ok' });
      });
    });
  });
};

