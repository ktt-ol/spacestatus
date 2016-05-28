/**
 * Helps finding new/unknown devices in the hackspace.
 * Using:
 *    sudo nmap -sP IP_RANGE | grep MAC | awk '{print $3}' > nmap_report.log
 *    node findNewDevices.js nmap_report.log
 */

'use strict';

var fs = require('fs');
var LazyLines = require('lazy-lines');

var HOST_PREFIX = 'Nmap scan report for ';
var MAC_PREFIX = 'MAC Address:';

(function () {
  if (process.argv.length < 3) {
    console.error('Usage: %s %s namp_scan_report', process.argv[0], process.argv[1]);
    return;
  }
  var nmapScanReport = process.argv[2];
  var stream = fs.createReadStream(nmapScanReport);

  stream.on('error',function (err) {
    console.error('Can´t read the file ´%s´!', nmapScanReport, err);
  }).on('end', printResults);

  var deviceMap = readDevicesFromConfig();

  var knownDevices = [];
  var newDevices = [];

  var target, mac;
  new LazyLines(stream)
    .forEach(function (line) {
      if (line.indexOf(HOST_PREFIX) === 0) {
        // begin of part
        target = extractHost(line);
        return;
      }

      if (line.indexOf(MAC_PREFIX) === 0) {
        mac = extractMacFromLine(line);
        return;
      }

      if (line.indexOf('Network Distance:') === 0) {
        // end of part
        if (!target || !mac) {
          console.warn('Missing target and/or mac adress for part.');
          console.log('\ttarget: %s\n\tmac: %s', target, mac);
        } else {
          //        console.log('Host: ´%s´ with mac ´%s´.', target, mac);
          addToList(target, mac);
        }

        // reset
        target = mac = undefined;
      }
    });


  function printResults() {
    console.log('---------------------------------');
    console.log('NEW (= unknown) devices: ');
    if (newDevices.length === 0) {
      console.log('none');
    } else {
      newDevices.forEach(function (item) {
        console.log('%s %s -> %s', item.mac.address, item.mac.ident, item.host);
      });
    }
    console.log('\n');
    console.log('Known devices:');
    knownDevices.forEach(function (item) {
      console.log('%s was online with %s', item.name, item.host);
    });
    console.log('---------------------------------');

  }

  function addToList(target, mac) {
    var entry = deviceMap[mac.address];
    if (!entry) {
      newDevices.push({
        host: target,
        mac: mac
      });
      return;
    }

    knownDevices.push({
      host: target,
      name: entry.name
    });
  }

  function extractHost(line) {
    // sample:
    // Nmap scan report for ........
    return line.substr(HOST_PREFIX.length);
  }

  var macMatcher = /mac address: ([0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}) (.*)/;

  function extractMacFromLine(line) {
    // sample:
    // MAC Address: ????????????? (Tp-link Technologies CO.)
    var m = macMatcher.exec(line.toLowerCase());
    if (!m || m.length < 1) {
      console.warn('Invalid mac address line: ' + line);
      return '?';
    }

    return {
      address: m[1],
      ident: m[2] || '?'
    };
  }

  function readDevicesFromConfig() {
    var config = require('./../../server/conf/config.js');
    return createDeviceMap(config.spaceDevices.list);
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
})();
