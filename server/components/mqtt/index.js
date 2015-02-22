'use strict';

var fs = require('fs');
var mqtt = require('mqtt');
var _ = require('lodash');

var config = require('../../config/environment');
var data = require('../../components/data');
var events = require('../../components/events');
var LOG = require('../logger/loggerFactory.js').logger();

var subscribed = false;
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
  }
};


// creates the mqtt client, connects to the server and registers on essentials events
function connect() {
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
      updateMqttStatus(false);
    }
  });
  client.on('connect', function () {
    LOG.info('mqtt connected.');
    updateMqttStatus(true);

    if (subscribed) {
      return;
    }
    client.subscribe([
        config.mqtt.devicesTopic
      ],
      function (err, granted) {
        if (err) {
          LOG.error('mqtt subscription failed', err);
          return;
        }
        LOG.info('mqtt topics subscribed', granted);
        subscribed = true;
      });
  });
  client.on('message', function (topic, message) {
    message = message.toString();
    LOG.debug('mqtt message ' + message);

    if (topic === config.mqtt.devicesTopic) {
      try {
        var data = JSON.parse(message);
        LOG.info('new devices data!', data);
        addDummyKeyData(data);
        updateSpaceDevices(data);
        resetAfterTimeout();
      } catch (e) {
        LOG.error('Invalid json as mqtt devices message: ' + message);
      }
    }
  });
}

// updates the connected status in the state object and send an event
function updateMqttStatus(isConnected) {
  data.state.get().mqtt.connected = isConnected;
  events.emit(events.EVENT.MQTT, {
    connected: isConnected
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