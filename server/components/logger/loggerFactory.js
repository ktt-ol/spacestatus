/**
 * A wrapper around the log4js module to load the correct config. You should require it at any places you want to log.
 *
 * The format function comes from https://github.com/danbell/log4js-node (/lib/connect-logger.js)
 */

'use strict';

var config = require('../../config/environment');

module.exports = {
  _log4js: undefined,
  _prefix: '',

  _ensureInitiliazedLogger: function () {
    if (!this._log4js) {
      this._log4js = require('log4js');
      this._log4js.configure(config.logger, {});
    }
  },

  addUncaughtExceptionLogger: function () {
    var self = this;
    process.on('uncaughtException', function (err) {
      self.logger().error(err);
      // I had some problems with missing errors after an error, maybe this help
      setTimeout(function () {
        process.exit(1);
      }, 500);
    });
  },

  addExpressLogger: function (expressApp, logIp) {
    this._ensureInitiliazedLogger();

    // if logIp is enabled, we patch the req.ip into a header field

    var formatStr = (logIp ? ':req[_ip_] - ' : '') +
      '":method :url HTTP/:http-version" :status :content-length ":referrer" ":user-agent"';
    var accessLogger = this._log4js.getLogger(this._prefix + 'express_access');
    var logFn = this._log4js.connectLogger(accessLogger, {
      level: this._log4js.levels.INFO,
      format: formatStr
    });

    var logTraceFn = function () {};
    if (accessLogger.isLevelEnabled(this._log4js.levels.TRACE)) {
      logTraceFn = function (req, res, next) {
        accessLogger.trace('Body: ', req.body);
      };
    }


    // create the custom header for log4js
    expressApp.use(function (req, res, next) {
      req.headers._ip_ = req.ip;
      logFn(req, res, next);
      logTraceFn(req, res, next);
    });
  },

  logger: function () {
    this._ensureInitiliazedLogger();
    return this._log4js.getLogger(this._prefix + 'app');
  }
};
