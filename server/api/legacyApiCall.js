/**
 * Provides some old api calls for legacy clients
 */

'use strict';

var express = require('express');

var router = express.Router();

router.get('/status-stream', function (req, res, next) {
  req.url = '/api/statusStream';
  req.query.spaceOpen = '1';
  next();
});

router.get('/status(.json)?$', function (req, res, next) {
  console.log('in status!');
  req.url = '/api/spaceInfo';
  next();
});

router.get('/time(.php)?', function (req, res, next) {
  req.url = '/api/time';
  next();
});

router.post('/switch(\\.php)?', function (req, res, next) {
  var pw = req.param('psk');
  var state = req.param('state');

  req.method = 'PUT';
  req.url = '/api/openState';
  req.headers.authorization = pw;
  req.headers['content-type'] = 'application/json';
  req.body = {
    state: state
  };

  // patching the response
  res.json = function (statusCode, jsonData) {
    if (statusCode === 200) {
      this.send(0);
    } else {
      this.send(1);
    }
  };

  next();
});

module.exports = router;