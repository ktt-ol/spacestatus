'use strict';

var LOG = require('./../aspects/loggerFactory.js').logger();
var EventEmitter = require('events').EventEmitter;

module.exports = {
  EVENT: {
    SPACE_OPEN: 'space_open',
    SPACE_DEVICES: 'spaceDevices',
    FREIFUNK: 'freifunk',
    WEATHER: 'weather'
  },

  _events: new EventEmitter(),

  _validateEventName: function (eventNmae) {
    var allEvents = module.exports.EVENT;
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
    var allEvents = module.exports.EVENT;
    for (var key in allEvents) {
      if (allEvents.hasOwnProperty(key)) {
        this.remove(allEvents[key], callback);
      }
    }
  },

  emit: function (eventName, data) {
    LOG.debug('Event: ' + eventName);

    this._validateEventName(eventName);
    this._events.emit(eventName, data);
  }
};
