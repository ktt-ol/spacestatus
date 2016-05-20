'use strict';

var express = require('express');
var controller = require('./openState.controller');

var router = express.Router();

router.get('/', controller.index);
router.put('/:place', controller.update);

module.exports = router;