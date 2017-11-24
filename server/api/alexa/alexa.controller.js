'use strict';

var apiUtils = require(('../apiUtils.js'));
var config = require('../../config/environment');
var data = require('../../components/data');
var LOG = require('./../../components/logger/loggerFactory.js').logger();

exports.status = function (req, res) {
  var space = data.state.get().openState.space;

  var text = 'Der aktuelle Status ist unbekannt.';
  switch (space.state) {
  case 'none':
  case 'keyholder':
  case 'member':
    text = 'Der Mainframe ist leider gerade schlossen.';
    break;
  case 'open':
  case 'open+':
    text = 'Der Mainframe ist geöffnet. Komm vorbei!';
    break;
  }

  apiUtils.sendJson(res, 200, {
    "uid": "urn:uuid:78c47212-83cd-423c-9b84-0dea6fd793da",
    "updateDate": (new Date(space.timestamp)).toISOString(),
    "titleText": "Der aktuelle Space Status",
    "mainText": text,
    "redirectionUrl": "https://status.mainframe.io/"
  });
};