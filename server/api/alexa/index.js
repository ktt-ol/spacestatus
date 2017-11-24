'use strict';

var express = require('express');
var controller = require('./alexa.controller');

var router = express.Router();

router.get('/status', controller.status);

module.exports = router;