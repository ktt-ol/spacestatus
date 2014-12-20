'use strict';

var apiUtils = require(('./apiUtils.js'));
//var LOG = require('./../aspects/loggerFactory.js').logger();

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    lastMinute: { required: true, type: 'integer' }
  }
};

module.exports = function (app, data, config, srv) {

  app.namespace('/powerUsage', function () {

      app.get('/', function (req, res) {
        apiUtils.sendJson(res, 200, data.state.get().powerUsage);
      });

      app.put('/', function (req, res) {
        apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
          if (err) {
            return;
          }

          var powerUsageState = data.state.get().powerUsage;
          powerUsageState.lastMinute = req.body.lastMinute;
          powerUsageState.timestamp = Math.round(Date.now() / 1000);

          var events = srv.events;
          events.emit(events.EVENT.POWER_USAGE, powerUsageState);

          apiUtils.sendJson(res, 200, { status: 'ok' });
        });


      }); // end put

    }
  );
};

