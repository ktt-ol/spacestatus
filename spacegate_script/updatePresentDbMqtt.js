#!/usr/bin/env node

/**
 * A node.js shell script to update the space status present db with current devices.
 * Does the following steps:
 * 1. Gets the current arp cache
 * 2. arping every entry
 * 3. Sends the resulting list of active mac addresses to the status server
 *
 * @author: Holger Cremer
 */

'use strict';

var fs = require('fs');
var spawn = require('child_process').spawn;
var Q = require('q');
var mqtt = require('mqtt');

var CONFIG = require('./config.js');

var arpingPromises = [];

readArpCache().forEach(function (cacheEntry) {
  if (cacheEntry.flags !== '0x2') {
    return;
  }
  if (cacheEntry.device !== CONFIG.lanDevice) {
    return;
  }
  debug('Cache entry:', cacheEntry);

  arpingPromises.push(arping(cacheEntry.ip));
});

Q.all(arpingPromises).done(
  function ok(responses) {
    responses = responses.filter(function (entry) {
      return !!entry;
    });

    debug(responses.length, 'arping responses');

    var devicesConfig = require('./devices');
    var devicesMaps = createMaps(devicesConfig.list);

    var result = countOnlineSpaceDevices(responses, devicesMaps);

    // send per mqtt
    var client = mqtt.connect(CONFIG.mqtt.server, {
      ca: fs.readFileSync(CONFIG.mqtt.ca),
      username: CONFIG.mqtt.username,
      password: CONFIG.mqtt.password
    });
    client.on('error', function (error) {
      console.error('Error sending presence to mqtt server:', error);
    });

    var asString = JSON.stringify(result);
    debug('sending ' + asString);
    client.publish(CONFIG.mqtt.topic, asString, {}, function () {
      client.end();
    });

  },
  function error(err) {
    console.error(err);
  });

/*
 Helper functions.
 */

function countOnlineSpaceDevices(devices, devicesMaps) {
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

    var entry = devicesMaps[deviceId];

    // is the device unknown?
    if (!entry) {
      unknownCounter++;
      return;
    }

    // count the device?
    if (entry.mode === 'ignore') {
      return;
    }

    // if the device owner is already known, then it is also already count
    if (people[entry.name]) {
      return;
    }

    // add the owner and count the device
    people[entry.name] = entry.mode;
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


// builds a maps from the configuration for a fast access
function createMaps(devicesConfigList) {
  var deviceMap = {};

  for (var i = 0; i < devicesConfigList.length; i++) {
    var nameBlock = devicesConfigList[i];

    for (var ii = 0; ii < nameBlock.devices.length; ii++) {
      var deviceId = nameBlock.devices[ii];
      deviceId = deviceId.toLowerCase();
      deviceMap[deviceId] = {
        // id may be undefined!
        id: nameBlock.id,
        name: nameBlock.name,
        mode: nameBlock.mode
      };
    }
  }

  return deviceMap;
}


function debug(/* var args */) {
  if (!CONFIG.debug) {
    return;
  }

  var args = Array.prototype.slice.call(arguments);
  args.unshift('DEBUG:');
  console.log.apply(console, args);
}


/**
 *
 * @param ip
 * @returns {promise}
 */
function arping(ip) {
  var deferred = Q.defer();
  var pingProcess = spawn(CONFIG.arping, [ '-r', '-i', CONFIG.lanDevice, '-c', CONFIG.pings, ip]);

  var result = '', errResult = '';
  pingProcess.stdout.on('data', function (data) {
    result += data;
  });
  pingProcess.stderr.on('data', function (data) {
    errResult += data;
  });

  pingProcess.on('error', function (error) {
    console.error('Could not call the arping program.', error);
    deferred.reject('Could not call the arping program.');
  });

  pingProcess.on('close', function (code) {
    if (code !== 0) {
      debug('arping !== 0', code, 'result', errResult);
      if (errResult.length > 0) {
        // not a normal error
        deferred.reject('Error response from arping: ' + errResult);
      } else {
        // arping could not find the requested ip
        deferred.resolve(null);
      }
      return;
    }

    var firstLine = result.split('\n')[0];

    // empty response means nothing found
    if (firstLine.length === 0) {
      deferred.resolve(null);
      return;
    }
    debug('arping success resolve', firstLine);
    deferred.resolve(firstLine);
  });

  return deferred.promise;
}

/**
 *
 * @returns {Array}
 */
function readArpCache() {
  var data, cols, i, lines, result = [];
  data = fs.readFileSync(CONFIG.device);
  lines = data.toString().split('\n');
  for (i = 0; i < lines.length; i++) {
    if (i === 0) {
      // the first line contains the header
      continue;
    }

    cols = lines[i].split(/\s+/);
    if (cols.length !== 6) {
      continue;
    }

    // cols array contains:
    // IP address, HW type, Flags, HW address, Mask, Device
    result.push({
      ip: cols[0],
      hwType: cols[1],
      flags: cols[2],
      hwAddress: cols[3],
      maks: cols[4],
      device: cols[5]
    });
  }

  return result;
}


