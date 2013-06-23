/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:vars, curly:true, devel:true, indent:2, maxerr:50, newcap:true, node: true */
/* global global: false, process: false, module: false */

"use strict";

module.exports = {
  logErrorOnUncaughtException: function () {
    if (this._listenOnExcp) {
      return;
    }
    process.on('uncaughtException', function (err) {
      var red = '\u001b[31m';
      console.log(red + 'Exception during test: ' + err);
    });

    this._listenOnExcp = true;
  },

  mockSetTimeout: function (newTimeoutFn) {
    function defaultSetTimeout(fn, timeout) {
      fn();
    }

    global._orig_setTimeout = global.setTimeout;
    global.setTimeout = newTimeoutFn || defaultSetTimeout;
  },
  restoreSetTimeout: function () {
    if (!global._orig_setTimeout) {
      throw new Error('Please use mockSetTimeout first.');
    }
    global.setTimeout = global._orig_setTimeout;
  },

  loggerMock: function (redirectToConsole) {

    function addLogMethod(loggerMock, name) {
      loggerMock[name] = function () {
        if (redirectToConsole) {
          Array.prototype.unshift.call(arguments, name.toUpperCase() + ': ');
          console.log.apply(this, arguments);
        }
      };
    }

    var mock = {};
    addLogMethod(mock, 'info');
    addLogMethod(mock, 'debug');
    addLogMethod(mock, 'error');

    return {
      logger: function () {
        return mock;
      }
    };
  } // end loggerMock

};
