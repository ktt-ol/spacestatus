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

var dirtyState = false;
var client;
var resetTimeoutHandle;

// event if this module is not active
resetAfterTimeout();
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
        config.mqtt.stateTopic.radstelle,
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
    LOG.debug('mqtt message ' + message);

    switch (topic) {
    case config.mqtt.spaceInternalBrokerTopic:
      var connected = message === '1';
      data.state.get().mqtt.spaceBrokerOnline = connected;
      broadcastMqtt();
      break;
    case config.mqtt.devicesTopic:
      try {
        var parsedMessage = JSON.parse(message);
        LOG.debug('new devices data!', parsedMessage);
        addDummyKeyData(parsedMessage);
        updateSpaceDevices(parsedMessage);
        resetAfterTimeout();
      } catch (e) {
        LOG.error('Invalid json as mqtt devices message: ' + message);
      }
      break;
    case config.mqtt.stateTopic.space:
      updateOpenState('space', message);
      break;
    case config.mqtt.stateTopic.radstelle:
      updateOpenState('radstelle', message);
      break;
    default:
      LOG.warn('Unknown topic: ' + topic);
    }
  });
}

function updateOpenState(place, message) {
  try {
    LOG.debug('new status data!', place, message);
    var dbStatus = mqtt2db(message);
    if (dbStatus === data.state.get().openState[place].state) {
      LOG.info('New mqtt state for "' + place + '" is same as current state -> No update.');
      return;
    }
    updateInternalSpaceStatus(dbStatus, place);
  } catch (e) {
    LOG.error('Error during status update message: ' + e);
  }
}

// updates the connected status in the state object and send an event
function broadcastMqtt() {
  events.emit(events.EVENT.MQTT, data.state.get().mqtt);
}

function broadcastState(place) {
  var stateNow = data.state.get().openState[place].state;
  stateNow = db2mqtt(stateNow);
  LOG.debug('sending new status for "', place, '" ', stateNow, ' to mqtt server.');
  if (!config.mqtt.stateTopic[place]) {
    LOG.warn('No topic defined for place ' + place);
    return;
  }
  client.publish(config.mqtt.stateTopic[place], stateNow, {
    retain: true
  });
}

function addDummyKeyData(devicesData) {
  devicesData.people = devicesData.people.map(function (name) {
    return {
      name: name,
      key: false
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


function mqtt2db(mqttValue) {
  switch (mqttValue) {
  case 'closing':
    return 'closing';
  case 'closed':
    return 'off';
  case 'opened':
    return 'on';
  }
  throw new Error('Unkown mqtt value: ' + mqttValue);
}

function db2mqtt(dbValue) {
  switch (dbValue) {
  case 'closing':
    return 'closing';
  case 'off':
    return 'closed';
  case 'on':
    return 'opened';
  }
  throw new Error('Unknown db value: ' + dbValue);
}

/**
 *
 * @param {string} newState - expecting a db open state value
 * @param {string} place - what place is updated?
 * @param {function} [callback] -
 */
function updateInternalSpaceStatus(newState, place, callback) {
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

    twitter.sendTwitterForSpaceStatus(newState);
    xmpp.updateForSpaceStatus(newState);

    var eventName = place === 'space' ? events.EVENT.SPACE_OPEN : events.EVENT.RADSTELLE_OPEN;
    events.emit(eventName, status);

    if (callback) {
      callback(undefined, newState);
    }
  });
}

// resets the state of the space devices after a certain timeout
function resetAfterTimeout() {
  if (resetTimeoutHandle) {
    clearTimeout(resetTimeoutHandle);
  }

  resetTimeoutHandle = setTimeout(function () {
    LOG.debug('Clear space devices.');
    updateSpaceDevices({
      deviceCount: 0,
      unknownDevicesCount: 0,
      peopleCount: 0,
      people: []
    });
  }, config.spaceDevices.clearEntriesAfter);
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