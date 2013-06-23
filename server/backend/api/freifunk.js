'use strict';

var apiUtils = require(('./apiUtils.js'));

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    client_count: { required: true, type: 'integer', minimum: 1 }
  }
};

module.exports = function (app, data, config, srv) {

  app.namespace('/freifunk', function () {

    app.get('/', function (req, res) {
      apiUtils.sendJson(res, 200, data.state.get().freifunk);
    });

    // Updtes the Freifunk data. After a successfull update, the 'freifunk' event is published. 'clients_count' must be >= 0
    app.put('/', function (req, res) {

      apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
        if (err) {
          return;
        }
        var ffState = data.state.get().freifunk;
        ffState.client_count = req.body.client_count;
        ffState.timestamp = Math.round(Date.now() / 1000);

        var events = srv.events;
        events.emit(events.EVENT.FREIFUNK, ffState);
        res.send(200, 'ok');
      });

    }); // end put

  });
};

