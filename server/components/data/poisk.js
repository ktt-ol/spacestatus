/**
 * Gets the current keyholders from the Poisk rest api and caches the result.
 */

'use strict';

var parseUrl = require('url').parse;
var http = require('http');
var https = require('https');
var LOG = require('../logger/loggerFactory.js').logger();

module.exports = function (poiskConfig, stateHandler) {

  var exp = {
    _schedulePoiskUpdate: function () {
      function update() {
        exp._updatePoisk(function () {
          setTimeout(update, poiskConfig.pollInterval);
        });
      }

      update();
    },

    // does the request to poisk and updates the internal state
    _updatePoisk: function (onCompleteFn) {
      var url = parseUrl(poiskConfig.apiEndpoint);
      var options = {
        hostname: url.hostname,
        port: url.port,
        path: url.path,
        agent: false
      };

      // for caching
      options.headers = {
        'If-None-Match': stateHandler.get().poisk.lastETag
      };

      var handler = url.protocol === 'https' ? https : http;
      var req = handler.get(options, function (res) {
//      console.log('statusCode: ', res.statusCode);
//      console.log('headers: ', res.headers);

        switch (res.statusCode) {
        case 200:
          res.on('data', function (data) {
//          console.log('data: ', data.toString());
            try {
              var pData = JSON.parse(data);
              if (!pData || !pData.current_keyholder || !Array.isArray(pData.current_keyholder)) {
                throw new Error('Expected "current_keyholder" to be an array, but got ' + pData.toString());
              }

              stateHandler.get().poisk.keyHolder = pData.current_keyholder;
              LOG.info('New poisk data: ' + JSON.stringify(pData.current_keyholder));

              // save the etag header to get a cached response next time
              if (res.headers && res.headers.etag) {
                stateHandler.get().poisk.lastETag = res.headers.etag;
              }
              onCompleteFn();
            } catch (e) {
              LOG.error('Got invalid json data from the poisk endpoint.', e);
              LOG.error('Data: ' + data.toString());
              onCompleteFn(e);
            }
          });
          break;
        case 304:
          LOG.debug('No updates from poisk (304).');
          onCompleteFn();
          break;
        default :
          LOG.error('Unexpected statusCode from the poisk endpoint: ' + res.statusCode);
          onCompleteFn();
          break;
        }
      });
      req.on('error', function (e) {
        LOG.error('Error on getting the newest poisk data.', e);
        onCompleteFn(e);
      });
    }

  };

  if (poiskConfig.enabled) {
    exp._schedulePoiskUpdate();
  } else {
    // just clean the old poisk state
    stateHandler.get().poisk.keyHolder = [];
  }

  return exp;
};