'use strict';

var mysql = require('mysql');
var LOG = require('../logger/loggerFactory.js').logger();
var PLACES = require('../../common/constants').PLACES;

module.exports = function (config) {

  var sqlclient = mysql.createClient(config.db);

  function checkState(stateValue) {
    if (['on', 'off', 'closing'].indexOf(stateValue) === -1) {
      throw new Error('Invalid state value: ' + stateValue);
    }
  }

  function checkPlace(placeValue) {
    if (PLACES.indexOf(placeValue) === -1) {
      throw new Error('Invalid place value: ' + placeValue);
    }
  }

  return {
    /**
     * The callback is called with an err obj (is undefined for no error) and a dbState parameter.
     */
    getLastOpenState: function (callback) {
      var sql = 'SELECT place, state, timestamp, until FROM spacestate where id in (' +
        '	SELECT max(id) FROM spacestate group by place' +
        ')';

      sqlclient.query(sql, function (err, results) {
        if (err) {
          LOG.error('SQL error in getLastOpenState: ' + err.message);
          callback(err);
          return;
        }

        // create a default state
        var dbState = {};
        PLACES.forEach(function (place) {
          dbState[place] = {
            state: 'off',
            timestamp: 0,
            until: 0
          };
        });

        // && results[0] && results[0].state
        if (results) {
          results.forEach(function (row) {
            // check place value
            if (!dbState[row.place]) {
              LOG.warn('Unexpected "place" value found in db: ' + row.place);
              return;
            }
            dbState[row.place].state = row.state;
            dbState[row.place].timestamp = row.timestamp || new Date();
            dbState[row.place].until = row.until || new Date(0);
          });
        }

        callback(undefined, dbState);
      });
    },

    getAllOpenStates: function (place, callback) {
      checkPlace(place);
      sqlclient.query('SELECT id, state, timestamp FROM spacestate where place = ? ORDER BY id asc', [place], function (err, results) {
        if (err) {
          LOG.error('SQL error in getLastOpenState: ' + err.message);
          callback(err);
          return;
        }

        callback(undefined, results);
      });
    },

    updateOpenState: function (stateValue, place, callback) {
      checkState(stateValue);
      checkPlace(place);
      sqlclient.query('INSERT INTO spacestate (state, place, timestamp) VALUES (?, ?, NOW())', [stateValue, place],
        function (err, results) {
          if (err) {
            LOG.error('SQL error in updateOpenState: ' + err.message);
            callback(err);
            return;
          }

          callback(undefined);
        });
    },

    updateDevicesAndPeople: function (devicesCount, peopleCount, callback) {
      sqlclient.query('INSERT INTO devices (devices, people, ts) VALUES (?, ?, NOW())', [devicesCount, peopleCount],
        function (err, results) {
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
