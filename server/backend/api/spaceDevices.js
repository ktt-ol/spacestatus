'use strict';

var apiUtils = require(('./apiUtils.js'));
var LOG = require('./../aspects/loggerFactory.js').logger();

var SCHEME = {
  type: 'object',
  additionalProperties: 'false',
  properties: {
    devices: { required: false, type: 'array', items: { type: 'string' } }
  }
};

module.exports = function (app, data, config, srv) {

  var resetTimeoutHandle;
  var dirtyState = false;
  var deviceMap = createDeviceMap(config.spaceDevices.list);

  resetAfterTimeout();
  scheduleDbUpdate();

  app.namespace('/spaceDevices', function () {

    app.get('/', function (req, res) {
      apiUtils.sendJson(res, 200, data.state.get().spaceDevices);
    });

    app.put('/', function (req, res) {

      apiUtils.validateRequest(req, res, SCHEME, config.app.psk, function (err) {
        if (err) {
          return;
        }

        // we can't set required to 'true', because amenda wont allow an empty array than
        // -> we have to check for the devices array by hand
        if (!req.body.devices) {
          apiUtils.sendJson(res, 400, { status: 'error', msg: 'Invalid request: The ‘devices’ property is required.' });
          return;
        }

        var result = countOnlineSpaceDevices(req.body.devices);
        updateSpaceDevices(result);
        resetAfterTimeout();

        apiUtils.sendJson(res, 200, { status: 'ok' });
      }); // end validate
    }); // end put

  }); // end namespace


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


  // updates the current state and sets the dirtyState if necessary
  function updateSpaceDevices(result) {
    var spaceDevices = data.state.get().spaceDevices;

    var dataChanged = spaceDevices.deviceCount !== result.deviceCount ||
      spaceDevices.unknownDevicesCount !== result.unknownDevicesCount ||
      spaceDevices.peopleCount !== result.peopleCount ||
      !isArrayEquals(spaceDevices.people, result.people);

    if (!dataChanged) {
      LOG.debug('spaceDevices didn´t change.');
      return;
    }

    spaceDevices.deviceCount = result.deviceCount;
    spaceDevices.peopleCount = result.peopleCount;
    spaceDevices.unknownDevicesCount = result.unknownDevicesCount;
    spaceDevices.people = result.people;
    spaceDevices.timestamp = Math.round(Date.now() / 1000);

    srv.events.emit(srv.events.EVENT.SPACE_DEVICES, spaceDevices);

    dirtyState = true;
    LOG.debug('Updated current devices', spaceDevices);
  }


  // compare two arrays
  function isArrayEquals(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  // resets the state of the space devices after a certain timeout
  function resetAfterTimeout() {
    if (resetTimeoutHandle) {
      clearTimeout(resetTimeoutHandle);
    }

    resetTimeoutHandle = setTimeout(function () {
      LOG.debug('Clear space devices.');
      updateSpaceDevices(0, 0, []);
    }, config.spaceDevices.clearEntriesAfter);
  }

  function countOnlineSpaceDevices(devices) {
    // The rules:
    // - every device is count for deviceCount
    // - every device with mode=ignore is ignored and not count anywhere except deviceCount
    // - every unknown device (= not in the config) counts as one device
    // - a person counts as one person, even it is online with several devices
    // - All devices that belongs to a person are not count as device
    // - every person with mode=visible is shown in the online list by name

    var rawDevicesCounter = 0;
    var unknownCounter = 0;
    var people = {};
    devices.forEach(function (deviceId) {
      rawDevicesCounter++;
      deviceId = deviceId.toLowerCase();

      // console.log('-----' + deviceId);
      var entry = deviceMap[deviceId];

      // is the device unknown?
      if (!entry) {
        unknownCounter++;
        // console.log('exit 1');
        return;
      }

      // count the device?
      if (entry.mode === 'ignore') {
        // console.log('exit 2');
        return;
      }

      // if the device owner is already known, then it is also already count
      if (people[entry.name]) {
        // console.log('exit 3: ' + entry.name);
        return;
      }

      // add the owner and count the device
      people[entry.name] = entry.mode;
      // console.log('exit 4: ' + entry.name);
    });
    // count the people and remove the hidden people from the list
    var peopleCount = 0;
    var publicList = [];
    for (var name in people) {
      if (people.hasOwnProperty(name)) {
        peopleCount++;
        if (people[name] === 'visible') {
          publicList.push(name);
        }
      }
    }

    return {
      deviceCount: rawDevicesCounter,
      unknownDevicesCount: unknownCounter,
      peopleCount: peopleCount,
      people: publicList
    };
  }

  // builds a map from the configuration for a fast access
  function createDeviceMap(devicesConfigList) {
    var map = {};

    for (var i = 0; i < devicesConfigList.length; i++) {
      var nameBlock = devicesConfigList[i];
      for (var ii = 0; ii < nameBlock.devices.length; ii++) {
        var deviceId = nameBlock.devices[ii];
        deviceId = deviceId.toLowerCase();
        map[deviceId] = {
          name: nameBlock.name,
          mode: nameBlock.mode
        };
      }
    }

    return map;
  }

};