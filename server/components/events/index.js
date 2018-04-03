'use strict';

var LOG = require('../logger/loggerFactory.js').logger();
var EventEmitter = require('events').EventEmitter;

var Events =  function () {

  var exportObj = {
    EVENT: {
      MQTT: 'mqtt',
      SPACE_OPEN: 'spaceOpen',
      RADSTELLE_OPEN: 'radstelleOpen',
      LAB_3D_OPEN: 'lab3dOpen',
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
      LOG.trace('Event: ' + eventName);

      this._validateEventName(eventName);
      this._events.emit(eventName, eventName, data);
    }
  };

  exportObj._events.setMaxListeners(250);

  return exportObj;
};

module.exports = new Events();
module.exports.init();
