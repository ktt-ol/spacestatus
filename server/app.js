/**
 * Main application file
 */

'use strict';

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var LoggerFactory = require('./components/logger/loggerFactory');
LoggerFactory.addUncaughtExceptionLogger();
var LOG = LoggerFactory.logger();

LOG.info('spacestatus is starting');

var express = require('express');
var config = require('./config/environment');
// quick config check
if (!config.app.psk || config.app.psk === '') {
  throw new Error('Please setup the psk in the config!');
}

var data = require('./components/data');
data.db.getLastOpenState(function (err, lastDbState) {
  if (err) {
    data.state.shutdown();
    throw new Error('Error: can`t get the last open state from the db: ' + err);
  }

  // db status clear, do the remaining intilisation
  next(lastDbState);
});

function shutdown() {
  LOG.info('Shutdown...');
  data.state.shutdown();
  data.state.save(function (err) {
    process.exit(0);
  });
}

function next(lastDbState) {
  var status = data.state.get().spaceOpen;
  if (lastDbState.state !== status.state) {
    status.state = lastDbState.state;
    // the state from the db contains Date objects, but we want to have a unix timestamp
    status.timestamp = Math.round(lastDbState.timestamp.getTime() / 1000);
    status.until = Math.round(lastDbState.until.getTime() / 1000);
    LOG.warn('Warning: internal state differs from db state. Using the latter (open: ' + JSON.stringify(status) + ').');
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Setup server
  var app = express();
  var server = require('http').createServer(app);
  require('./config/express')(app);
  require('./routes')(app);

  require('./components/mqtt').init();

// Start server
  server.listen(config.port, config.ip, function () {
    LOG.info('Status server listening on %d, in %s mode', config.port, app.get('env'));
  });

// Expose app
  exports = module.exports = app;
}

