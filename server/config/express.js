/**
 * Express configuration
 */

'use strict';

var express = require('express');
var favicon = require('serve-favicon');
var compression = require('compression');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var errorHandler = require('errorhandler');
var path = require('path');
var config = require('./environment');
var LoggerFactory = require('./../components/logger/loggerFactory');

module.exports = function(app) {
  var env = app.get('env');

  app.set('views', config.root + '/server/views');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  app.use(compression());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(methodOverride());

  app.disable('x-powered-by');
  if (config.app.behindProxy) {
    app.enable('trust proxy');
  }


  // catches all errors and send a proper message to the client
//  app.use(function (err, req, res, next) {
//    if (err.status === 400) {
//      // client eeror
//      LOG.error('Invalid request: ' + err.message);
//      apiUtils.sendJson(res, 400, { status: 'error', msg: err.message });
//      return;
//    }
//
//    LOG.error('Error caught: ', err);
//    apiUtils.sendJson(res, 500, { status: 'error', msg: 'Internal Server Error' });

  if ('production' === env) {
    app.use(favicon(path.join(config.root, 'public', 'favicon.ico')));
    app.use(express.static(path.join(config.root, 'public')));
    app.set('appPath', config.root + '/public');
    LoggerFactory.addExpressLogger(app, config.app.logIp);
  }

  if ('development' === env || 'test' === env) {
    app.use(require('connect-livereload')());
    app.use(express.static(path.join(config.root, '.tmp')));
    app.use(express.static(path.join(config.root, 'client')));
    app.set('appPath', 'client');
    LoggerFactory.addExpressLogger(app, config.app.logIp);
    app.use(errorHandler()); // Error handler - has to be last
  }
};