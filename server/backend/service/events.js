'use strict';

var LOG = require('./../aspects/loggerFactory.js').logger();
var EventEmitter = require('events').EventEmitter;

module.exports = function () {

  var exportObj = {
    EVENT: {
      SPACE_OPEN: 'spaceOpen',
      SPACE_DEVICES: 'spaceDevices',
      POWER_USAGE: 'powerUsage',
      FREIFUNK: 'freifunk',
      WEATHER: 'weather'
    },

    _events: new EventEmitter(),

    init: function () {
      this._events.setMaxListeners(250);
    },

    _validateEventName: function (eventNmae) {
      var allEvents = exportObj.EVENT;
      for (var key in allEvents) {
        if (allEvents.hasOwnProperty(key) && allEvents[key] === eventNmae) {
          return;
        }
      }
      throw new Error('Invalid event name.');
    },

    on: function (eventName, callback) {
      this._validateEventName(eventName);
      this._events.on(eventName, callback);
    },

    remove: function (eventName, callback) {
      this._validateEventName(eventName);
      this._events.removeListener(eventName, callback);
    },

    removeAll: function (callback) {
      var allEvents = exportObj.EVENT;
      for (var key in allEvents) {
        if (allEvents.hasOwnProperty(key)) {
          this.remove(allEvents[key], callback);
        }
      }
    },

    emit: function (eventName, data) {
      LOG.debug('Event: ' + eventName);

      this._validateEventName(eventName);
      this._events.emit(eventName, eventName, data);
    }
  };

  exportObj._events.setMaxListeners(250);

  return exportObj;
};
