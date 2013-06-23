'use strict';

var apiUtils = require(('./apiUtils.js'));
var LOG = require('./../aspects/loggerFactory.js').logger();

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    state: { required: true, type: 'string', enum: ['on', 'off', 'closing'] },
    until: { required: false, type: 'integer' }
  }
};

module.exports = function (app, data, config, srv) {

  app.namespace('/openState', function () {

    app.get('/', function (req, res) {
      apiUtils.sendJson(res, 200, data.state.get().status);
    });

    app.put('/', function (req, res) {

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

          srv.twitter.sendTwitterForSpaceStatus(newState);
          srv.xmpp.updateForSpaceStatus(newState);

          var events = srv.events;
          events.emit(events.EVENT.SPACE_OPEN, status);


          apiUtils.sendJson(res, 200, { status: 'ok' });
        });

      });

    }); // end put

  });
};

