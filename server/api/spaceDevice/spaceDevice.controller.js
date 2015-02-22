'use strict';

var apiUtils = require(('../apiUtils.js'));
var config = require('../../config/environment');
var data = require('../../components/data');

exports.index = function (req, res) {
  apiUtils.sendJson(res, 200, data.state.get().spaceDevices);
};

