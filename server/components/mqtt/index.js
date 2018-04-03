'use strict';

var fs = require('fs');
var mqtt = require('mqtt');
var _ = require('lodash');

var config = require('../../config/environment');
var data = require('../../components/data');
var events = require('../../components/events');
var LOG = require('../logger/loggerFactory.js').logger();
var twitter = require('../../components/twitter');
var xmpp = require('../../components/xmpp');
var CONST = require('../../common/constants');

var dirtyState = false;
var client;
var resetTimeoutHandle;

var spaceLast = null;
var spaceNextLast = null;

// event if this module is not active
scheduleDbUpdate();

module.exports = {

  init: function () {
    data.state.get().mqtt.connected = false;

    if (!config.mqtt.enabled) {
      LOG.info('mqtt is disabled.');
      return;
    }

    connect();
  },

  setNewStatus: function (newState, place, callback) {
    updateInternalSpaceStatus(newState, place, function (err) {
      if (err) {
        callback(err);
        return;
      }

      broadcastState(place);
      callback();
    });
  }
};


// the debounce helps us for the case that state and state-next are both changed
var triggerNewOpenState = _.debounce(function () {
  if (spaceLast === null) {
    LOG.warn('spaceLast is null!');
    return;
  }
  LOG.debug('triggerNewOpenState - spaceLast: ' + spaceLast + ", spaceNextLast: " + spaceNextLast);
  if (spaceLast !== 'open+' && spaceLast !== 'open') {
    updateOpenState('space', spaceLast);
    return;
  }

  // is the next state close for guests?
  if (spaceNextLast === 'member' || spaceNextLast === 'keyholder' || spaceNextLast === 'none') {
    updateOpenState('space', 'closing');
  } else {
    // no special closing state
    updateOpenState('space', spaceLast);
  }
}, 500);

// creates the mqtt client, connects to the server and registers on essentials events
function connect() {
  LOG.debug('Try to connect to mqtt server...');
  var options = {
    username: config.mqtt.username,
    password: config.mqtt.password,
    reconnectPeriod: 10000
  };
  if (config.mqtt.caCert) {
    options.ca = fs.readFileSync(config.mqtt.caCert);
  }
  if (config.mqtt.extras) {
    options = _.merge(options, config.mqtt.extras);
  }

  client = mqtt.connect(config.mqtt.url, options);

  client.on('error', function (error) {
    LOG.error('mqtt error: ' + error);
  });
  client.on('close', function () {
    if (data.state.get().mqtt.connected) {
      LOG.info('mqtt connection CLOSED.');
      data.state.get().mqtt.connected = false;
      broadcastMqtt();
    }
  });
  client.on('connect', function () {
    LOG.info('mqtt connected.');
    data.state.get().mqtt.connected = true;
    broadcastMqtt();

    client.subscribe([
        config.mqtt.devicesTopic,
        config.mqtt.stateTopic.space,
        config.mqtt.stateTopic.spaceNext,
        config.mqtt.stateTopic.radstelle,
        config.mqtt.stateTopic.lab3d,
        config.mqtt.energyTopic.front,
        config.mqtt.energyTopic.back,
        config.mqtt.spaceInternalBrokerTopic
      ],
      function (err, granted) {
        if (err) {
          LOG.error('mqtt subscription failed', err);
          return;
        }
        LOG.info('mqtt topics subscribed', granted);
      });
  });
  client.on('message', function (topic, message) {
    message = message.toString();

    switch (topic) {
    case config.mqtt.spaceInternalBrokerTopic:
      var connected = message === '1';
      data.state.get().mqtt.spaceBrokerOnline = connected;
      broadcastMqtt();
      break;
    case config.mqtt.devicesTopic:
      try {
        var parsedMessage = JSON.parse(message);
        LOG.trace('new devices data!', parsedMessage);
        toPersonObj(parsedMessage);
        updateSpaceDevices(parsedMessage);
      } catch (e) {
        LOG.error('Invalid json as mqtt devices message: ' + message.substring(0, 20) + '\n' + e.message);
      }
      break;
    case config.mqtt.stateTopic.space:
      spaceLast = message;
      triggerNewOpenState();
      break;
    case config.mqtt.stateTopic.spaceNext:
      spaceNextLast = message;
      triggerNewOpenState();
      break;
    case config.mqtt.stateTopic.radstelle:
      updateOpenState('radstelle', message);
      break;
    case config.mqtt.stateTopic.lab3d:
      updateOpenState('lab3d', message);
      break;
    case config.mqtt.energyTopic.front:
      updateEnergy('front', message);
      break;
    case config.mqtt.energyTopic.back:
      updateEnergy('back', message);
      break;
    default:
      LOG.warn('Unknown topic: ' + topic);
    }
  });
}

function updateOpenState(place, message) {
  try {
    LOG.debug('new status data!', place, message);
    var dbStatus = message;
    if (dbStatus === data.state.get().openState[place].state) {
      LOG.info('New mqtt state for "' + place + '" is same as current state -> No update.');
      return;
    }
    updateInternalSpaceStatus(dbStatus, place);
  } catch (e) {
    LOG.error('Error during status update message: ' + e);
  }
}

/**
 *
 * @param {string} name - front or back
 * @param message
 */
function updateEnergy(name, message) {
  LOG.debug('new energy data', name, message);

  var value = parseFloat(message);
  if (isNaN(value)) {
    LOG.warn('Invalid energy data for ', name, message);
    return;
  }

  var powerUsageState = data.state.get().powerUsage;
  powerUsageState[name].value = value;
  powerUsageState[name].timestamp = Math.round(Date.now() / 1000);

  events.emit(events.EVENT.POWER_USAGE, powerUsageState);
}

// updates the connected status in the state object and send an event
function broadcastMqtt() {
  events.emit(events.EVENT.MQTT, data.state.get().mqtt);
}

function broadcastState(place) {
  var stateNow = data.state.get().openState[place].state;
  // stateNow = db2mqtt(stateNow);
  LOG.debug('sending new status for "', place, '" ', stateNow, ' to mqtt server.');
  if (!config.mqtt.stateTopic[place]) {
    LOG.warn('No topic defined for place ' + place);
    return;
  }
  client.publish(config.mqtt.stateTopic[place], stateNow, {
    retain: true
  });
}

function toPersonObj(devicesData) {
  devicesData.people = devicesData.people.map(function (person) {
    if (person.name) {
      return person;
    }
    return {
      name: person
    }
  });
}

// updates the current state and sets the dirtyState if necessary
function updateSpaceDevices(result) {
  var spaceDevices = data.state.get().spaceDevices;

  var dataChanged = spaceDevices.deviceCount !== result.deviceCount ||
    spaceDevices.unknownDevicesCount !== result.unknownDevicesCount ||
    spaceDevices.peopleCount !== result.peopleCount || !_.isEqual(spaceDevices.people, result.people);

  if (!dataChanged) {
    LOG.debug('spaceDevices didn´t change.');
    return;
  }

  spaceDevices.deviceCount = result.deviceCount;
  spaceDevices.peopleCount = result.peopleCount;
  spaceDevices.unknownDevicesCount = result.unknownDevicesCount;
  spaceDevices.people = result.people;
  spaceDevices.timestamp = Math.round(Date.now() / 1000);

  events.emit(events.EVENT.SPACE_DEVICES, spaceDevices);

  dirtyState = true;
  LOG.debug('Updated current devices', spaceDevices);
}

function oldMqtt2New(oldValue) {
  switch (oldValue) {
  case 'closed':
    return 'none';
  case 'opened':
    return 'open';
  default:
    return oldValue;
  }
}

/**
 *
 * @param {string} newState - expecting a db open state value
 * @param {string} place - what place is updated?
 * @param {function} [callback] -
 */
function updateInternalSpaceStatus(newState, place, callback) {
  newState = oldMqtt2New(newState);

  data.db.updateOpenState(newState, place, function (err) {
    if (err) {

      LOG.error('Error during status db update: ', err);
      if (callback) {
        callback(err);
      }
      return;
    }

    var status = data.state.get().openState[place];
    status.state = newState;
    status.timestamp = Math.round(Date.now() / 1000);
    LOG.info('Change the status of "' + place + '" to: ' + newState);

    var eventName;
    if (place === CONST.PLACE_SPACE) {
      eventName = events.EVENT.SPACE_OPEN;
    } else if (place === CONST.PLACE_RADSTELLE) {
      eventName = events.EVENT.RADSTELLE_OPEN;
    } else if (place === CONST.PLACE_3D_LAB) {
      eventName = events.EVENT.LAB_3D_OPEN;
    } else {
      throw new Error('Unknown place: ' + place);
    }

    twitter.sendTwitterForSpaceStatus(newState, place);
    xmpp.updateForSpaceStatus(newState, place);

    events.emit(eventName, status);

    if (callback) {
      callback(undefined, newState);
    }
  });
}

function scheduleDbUpdate() {
  setTimeout(updateDb, config.spaceDevices.dbUpdateTime);

  function updateDb() {
    if (!dirtyState) {
      LOG.debug('No changed db state, no db updated needed.');
      setTimeout(updateDb, config.spaceDevices.dbUpdateTime);
      return;
    }

    var spaceDevices = data.state.get().spaceDevices;
    data.db.updateDevicesAndPeople(spaceDevices.unknownDevicesCount, spaceDevices.peopleCount, function (err) {
      if (err) {
        LOG.warn('DB error during saving new space devices state.');
        setTimeout(updateDb, config.spaceDevices.dbUpdateTime);
        return;
      }

      LOG.debug('Updated spaceDevices in db.');
      dirtyState = false;

      setTimeout(updateDb, config.spaceDevices.dbUpdateTime);
    });
  }
}