'use strict';

var apiUtils = require(('../apiUtils.js'));

exports.index = function (req, res) {
  var ts = Math.round(Date.now() / 1000);

  if (req.param('plain') === true) {
    res.send(200, ts);
  } else {
    apiUtils.sendJson(res, 200, { timestamp: ts });
  }
};