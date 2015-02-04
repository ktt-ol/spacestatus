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
var needle = require('needle');


var CONFIG = {
  debug: false,
  device: '/proc/net/arp',
  arping: '/usr/sbin/arping',
  lanDevice: 'eth1',
//  device: 'sample_proc_net_arp',
//  arping: '/Users/holger/Seafile/devProjects/mainframe/status/spacegate_script/simulate_arp_ping',
//  lanDevice: 'br0',
  pings: 3,
  endpointUrl: 'https://status.kreativitaet-trifft-technik.de/api/spaceDevices',
//  endpointUrl: 'http://localhost:9000/api/spaceDevices',
  endpointPw: 'test'
};

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

    var statusData = {
      'devices': responses
    };

    debug(responses.length, 'arping responses');
    sendToStatusServer(statusData);
  },
  function error(err) {
    console.error(err);
  });

/*
  Helper functions.
 */

function debug(/* var args */) {
  if (!CONFIG.debug) {
    return;
  }

  var args = Array.prototype.slice.call(arguments);
  args.unshift('DEBUG:');
  console.log.apply(console, args);
}

function sendToStatusServer(statusData) {
  var options = {
    headers: {
      'Authorization': CONFIG.endpointPw,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    rejectUnauthorized: false
  };
  debug('Sending to server. ', options, statusData);
  needle.put(CONFIG.endpointUrl, JSON.stringify(statusData), options, function (err, response, body) {
    if (err) {
      console.log('error:', err);
      return;
    }

    if (response.statusCode !== 200) {
      console.error('Non 200 response from server: ', body);
    }
    debug('Result from server', body);
  });
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


