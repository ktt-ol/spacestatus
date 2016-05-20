/**
 * Main application file
 */

'use strict';

var PLACES = require('./common/constants').PLACES;

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
data.db.getLastOpenState(function (err, lastDbStates) {
  if (err) {
    data.state.shutdown();
    throw new Error('Error: can`t get the last open state from the db: ' + err);
  }

  // db status clear, do the remaining intilisation
  initWithState(lastDbStates);
});

function shutdown() {
  LOG.info('Shutdown...');
  data.state.shutdown();
  data.state.save(function (err) {
    process.exit(0);
  });
}

function updateInternalState(place, lastDbStates) {
  var status = data.state.get().openState[place];
  var dbStatus = lastDbStates[place];
  if (dbStatus.state !== status.state) {
    status.state = dbStatus.state;
    // the state from the db contains Date objects, but we want to have a unix timestamp
    status.timestamp = Math.round(dbStatus.timestamp.getTime() / 1000);
    status.until = Math.round(dbStatus.until.getTime() / 1000);
    LOG.warn('Warning: internal state for "' + place +
      '" differs from db state. Using the latter (open: ' + JSON.stringify(status) + ').');
  }
}

function initWithState(lastDbStates) {
  PLACES.forEach(function (place) {
    updateInternalState(place, lastDbStates);
  });
  
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

