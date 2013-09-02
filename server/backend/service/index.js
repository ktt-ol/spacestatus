'use strict';

module.exports = {

  init: function (config, data) {
    var srv = {};

    var Twitter = require('./twitter.js');
    var Xmpp = require('./xmpp.js');
    var Events = require('./events.js');
    var Poisk = require('./poisk.js');

    srv.twitter = new Twitter(config.twitter, data.state);
    srv.xmpp = new Xmpp(config.xmpp, data.state);
    srv.events = new Events();
    srv.poisk = new Poisk(config.poisk, data.state);

    return srv;
  }

};
