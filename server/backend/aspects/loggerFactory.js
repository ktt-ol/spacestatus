/**
 * A wrapper around the log4js module to load the correct config. You should require it at any places you want to log.
 *
 * The format function comes from https://github.com/danbell/log4js-node (/lib/connect-logger.js)
 */

'use strict';


module.exports = {
  _log4js: undefined,
  _prefix: '',

  _ensureInitiliazedLogger: function () {
    if (!this._log4js) {
      this._log4js = require('log4js');
      this._log4js.configure('conf/logging.json', {});

      if (process.env.NODE_ENV !== 'production') {
        console.info('Running in development mode, thus we`re using the appender with DEV_ prefix.');
        this._prefix = 'DEV_';
      }

    }
  },

  addUncaughtExceptionLogger: function () {
    var self = this;
    process.on('uncaughtException', function (err) {
      self.logger().error(err);
      process.exit(1);
    });
  },

  addExpressLogger: function (expressApp, logIp) {
    this._ensureInitiliazedLogger();

    var formatStr = (logIp ? ':remote-addr - ' : '') +
      '":method :url HTTP/:http-version" :status :content-length ":referrer" ":user-agent"';
    var accessLogger = this._log4js.getLogger(this._prefix + 'express_access');
    expressApp.use(this._log4js.connectLogger(accessLogger, {
      level: this._log4js.levels.INFO,
      format: formatStr
    }));
  },

  logger: function () {
    this._ensureInitiliazedLogger();
    return this._log4js.getLogger(this._prefix + 'app');
  }
};
