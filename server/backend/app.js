'use strict';

// imports
var config = require('./../conf/config.js');
require('date-utils');
var express = require('express');
var apiUtils = require('./api/apiUtils.js');

var LoggerFactory = require('./aspects/loggerFactory.js');
var api = require('./api/');
var data = require('./data/');
var srv = require('./service/');

require('express-namespace');

LoggerFactory.addUncaughtExceptionLogger();
var LOG = LoggerFactory.logger();

var app;


// quick config check
if (!config.app.psk || config.app.psk === '') {
  throw new Error('Please setup the psk in the config!');
}

data = data.init(config);

data.db.getLastOpenState(function (err, lastDbState) {
  if (err) {
    data.state.shutdown();
    throw new Error('Error: can`t get the last open state from the db: ' + err);
  }

  // db status clear, do the remaining intilisation
  init(lastDbState);
});

function init(lastDbState) {
  srv = srv.init(config, data);

  var status = data.state.get().status;
  if (lastDbState.state !== status.state) {
    status.state = lastDbState.state;
    // the state from the db contains Date objects, but we want to have a unix timestamp
    status.timestamp = Math.round(lastDbState.timestamp.getTime() / 1000);
    status.until = Math.round(lastDbState.until.getTime() / 1000);
    LOG.warn('Warning: internal state differs from db state. Using the latter (open: ' + JSON.stringify(status) + ').');

  }

  process.on('SIGINT', function () {
    LOG.info('Shutdown...');
    data.state.shutdown();
    data.state.save(function (err) {
      process.exit(0);
    });
  });

  // all the web foo
  app = express();
  app.disable('x-powered-by');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/../frontend'));

  // this must before the other use
  LoggerFactory.addExpressLogger(app);

  api.init(app, data, config, srv);

  // catches all errors and send a proper message to the client
  app.use(function (err, req, res, next) {
    if (err.status === 400) {
      // client eeror
      LOG.error('Invalid request: ' + err.message);
      apiUtils.sendJson(res, 400, { status: 'error', msg: err.message });
      return;
    }

    LOG.error('Error caught: ', err);
    apiUtils.sendJson(res, 500, { status: 'error', msg: 'Internal Server Error' });
  });


  app.listen(config.app.port);
  LOG.info('Status server listening on port %d in %s mode', config.app.port, app.settings.env);
}
