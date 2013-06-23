'use strict';

var mysql = require('mysql');
var LOG = require('./../aspects/loggerFactory.js').logger();

module.exports = function (config) {

  var sqlclient = mysql.createClient(config.db);

  return {
    /**
     * The callback is called with an err obj (is undefined for no error) and a dbState parameter.
     */
    getLastOpenState: function (callback) {
      sqlclient.query('SELECT state, timestamp, until FROM spaceschalter.spacestate ORDER BY id desc limit 1', function (err, results) {
        if (err) {
          LOG.error('SQL error in getLastOpenState: ' + err.message);
          callback(err);
          return;
        }

        // create a default state
        var dbState = {
          state: 'off',
          timestamp: 0,
          until: 0
        };
        if (results && results[0] && results[0].state) {
          dbState.state = results[0].state;
          dbState.timestamp = results[0].timestamp || new Date();
          dbState.until = results[0].until || new Date(0);
        }

        callback(undefined, dbState);
      });
    },

    getAllOpenStates: function (callback) {
      sqlclient.query('SELECT id, state, timestamp FROM spaceschalter.spacestate ORDER BY id asc', function (err, results) {
        if (err) {
          LOG.error('SQL error in getLastOpenState: ' + err.message);
          callback(err);
          return;
        }

        callback(undefined, results);
      });
    },

    updateOpenState: function (stateValue, callback) {
      sqlclient.query('INSERT INTO spaceschalter.spacestate SET state = ?, timestamp = NOW()', [ stateValue ],
        function (err, results) {
          if (err) {
            LOG.error('SQL error in updateOpenState: ' + err.message);
            callback(err);
            return;
          }

          callback(undefined);
        });
    },

    updateDevicesAndPeople: function(devicesCount, peopleCount, callback) {
      sqlclient.query('INSERT INTO spaceschalter.devices (devices, people, ts) VALUES (?, ?, NOW())', [ devicesCount, peopleCount ],
        function(err, results) {
          if (err) {
            LOG.error('SQL error in updateDeviceAndPeople: ' + err.message);
            callback(err);
            return;
          }

          callback(undefined);
        });
    }
  };
};
