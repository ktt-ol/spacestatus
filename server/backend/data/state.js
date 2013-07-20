/**
 * Holds the internal state and provides function for load/save.
 */

'use strict';

var ce = require('cloneextend');
var fs = require('fs');
var LOG = require('./../aspects/loggerFactory.js').logger();

module.exports = StateHandler;

function StateHandler(stateFile) {
  this._file = stateFile;
  this._state = ce.clone(StateHandler.DEFAULT_STATE);

  if (typeof this._file !== 'string' || this._file.length === 0) {
    throw new Error('Please setup a filename for the state file');
  }
}

// A default state with default parameter values.
// Please add every state key/value here for documentation
StateHandler.DEFAULT_STATE = {
  // The following are sent JSONified as events
  'status': {
    'state': 'off', // allowed: on, off, closing
    'until': 0, // Until when will it be open?
    'timestamp': 0 // When did the state last change?
  },

  'spaceDevices': {
    'deviceCount': 0, // the pure number of devices
    'peopleCount': 0, // the same as deviceCount, but reduced by some devices if we know the owners
    'people': [], // a list of people currently in the space (detected by their devices and their permission is required)
    'timestamp': 0 // last update
  },

  'freifunk': {
    'client_count': 0, // How many clients are connected to the Freifunk network at the space?
    'timestamp': 0
    // When did we last hear from Freifunk?
  },

  'weather': {
    'timestamp': 0, // At what time did we last hear from the weather station?
    'Tin': 0, // Temperature inside
    'Tout': 0, // Temperature outside
    'Hin': 0, // Humidity inside
    'Hout': 0, // Humidity outside
    'P': 0, // Pressure
    'Ws': 0, // Windspeed
    'Wg': 0, // Windgust
    'Wd': 0, // Wind direction
    'R': 0
    // Rain clicks
  },

  'twitter': {
    'enabled': true,
    'lastStateTwittered': null,
    'lastTweetSendAt': 0
  }
};

/**
 *
 * @returns the current state
 */
StateHandler.prototype.get = function () {
  return this._state;
};

StateHandler.prototype.shutdown = function () {
  if (this._timeoutId) {
    clearTimeout(this._timeoutId);
  }
};

StateHandler.prototype.enableAutoSave = function (interval) {
  if (typeof interval !== 'number' || interval <= 1000) {
    throw new Error('Auto save interval is too short: ' + interval);
  }

  var self = this;

  function autoSave() {
    self.save(function () {
      self._timeoutId = setTimeout(autoSave, interval);
    });
  }

  self._timeoutId = setTimeout(autoSave, interval);
};

/**
 * Loads the state from disk. The current state will not be lost, but replaced with values from the file.
 */
StateHandler.prototype.load = function () {
  if (!fs.existsSync(this._file)) {
    LOG.info('No old state file found to load the config from.');
    return;
  }
  var file = fs.readFileSync(this._file, {
    encoding: 'utf8'
  });
  try {
    var stateFromFile = JSON.parse(file);
    this._state = ce.replace(this._state, stateFromFile);
  } catch (e) {
    throw new Error('Can´t parse the state file. Did the json content get damaged?\n' + e);
  }
};

StateHandler.prototype.save = function (saveDoneFn) {
  fs.writeFile(this._file, JSON.stringify(this._state), {
    encoding: 'utf8'
  }, saveDoneFn);
};