'use strict';

var express = require('express');
var controller = require('./spaceInfo.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/asterisk', controller.asterisk);

module.exports = router;