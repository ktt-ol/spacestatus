'use strict';

module.exports = {

  init: function (config, data) {
    var srv = {};

    var Twitter = require('./twitter.js');
    var Xmpp = require('./xmpp.js');
    var events = require('./events.js');

    srv.twitter = new Twitter(config.twitter);
    srv.xmpp = new Xmpp(config.xmpp, data.state);
    srv.events = events;

    return srv;
  }

};
