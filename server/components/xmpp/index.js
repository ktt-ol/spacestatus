'use strict';

var Client = require('node-xmpp-client');
var ltx = require('node-xmpp-core').ltx;
var LOG = require('../logger/loggerFactory.js').logger();
var C = require('../../common/constants');

var Xmpp = function (xmppConfig, state) {

  var xmppClient = null;
  // is the XMPP client connected?
  var isConnected = false;

  this._init = function () {
    if (!xmppConfig.enabled) {
      return;
    }

    xmppClient = new Client(xmppConfig.client);

    var self = this;
    xmppClient.on('online', function () {
      LOG.info('xmpp client is online!');
      isConnected = true;

      self.updateForSpaceStatus(state.get().openState.space.state);
    });
    xmppClient.on('error', function (excp) {
      LOG.error('Error in xmpp client: ' + (excp.message || excp));
    });

    xmppClient.on('disconnect', function (e) {
      LOG.error('Client is disconnected', xmppClient.connection.reconnect, e);
    });

    xmppClient.on('stanza', function (stanza) {
      if (stanza.is('presence') && stanza.attrs.type === 'subscribe') {
        // accept any auth requests!
        LOG.info('Got (and accept) auth request from ', stanza.attrs.from);
        xmppClient.send(new ltx.Element('presence', {
          'from': stanza.attrs.to,
          'to': stanza.attrs.from,
          type: 'subscribed'
        }));
      } else if (stanza.is('message')) {
        if (stanza.attrs.type !== 'chat') {
          return;
        }
        var body = stanza.getChild('body');
        if (!body) {
          return;
        }
        var msg;
        if (body.getText() === '?') {
          msg = 'The current status as json: ' +
            JSON.stringify(state.get()) +
            '\nIf you want to have a nice format, send me a patch.';
          reply(msg);
        } else if (body.getText() === 'who') {
          // make a nice formatted string from the data
          var people = state.get().spaceDevices.people;
          if (people.length === 0) {
            msg = 'Niemand!';
          } else {
            msg = people.map(function (value) {
              return value.name + '[' + (value.key ? 'X' : '') + ']';
            }).join(', ');
          }
          reply(msg);
        } else {
          msg = 'Available commands:\n' +
            '?   - Dump internal status object in JSON notation\n' +
            'who - Dump list of people detected in space';
          reply(msg);
        }
      }

      function reply(msg) {
        var msgElement = new ltx.Element('message', {
          to: stanza.attrs.from,
          type: 'chat'
        }).c('body').t(msg, false, 3);
        xmppClient.send(msgElement);
      }

    }); // on stanza
  };


  this._toInternalState = function (newState) {
    switch (newState) {
    case 'none':
    case 'keyholder':
    case 'member':
      return 'isClosed';
    case 'open':
    case 'open+':
      return 'isOpen';
    case 'closing':
      return 'isClosing';
    }

    throw new Error('Unknown newState "' + newState + '" Please use the new states + closing.');
  };


  this.isConnected = function () {
    return isConnected;
  };

  this.updateForSpaceStatus = function (spaceStatus, place) {
    var internalState = this._toInternalState(spaceStatus);
    
    if (!xmppConfig.enabled || !isConnected) {
      return;
    }

    if (place !== C.PLACE_SPACE) {
      return;
    }

    if (internalState === 'isOpen') {
      this._setPresence('chat', 'Mainframe ist geoeffnet, kommt vorbei!');
    } else if (internalState === 'closing') {
      this._setPresence('away', 'Mainframe schließt gleich!');
    } else {
      // xa = "eXtended Away"
      this._setPresence('xa', 'Mainframe ist leider geschlossen. Bis zum naechsten Mal!');
    }
  };

  this._setPresence = function (show, status) {
    xmppClient.send(new ltx.Element('presence', {}).c('show').t(show).up().c('status').t(status));
  };

  this._init();
};

var config = require('../../config/environment');
var data = require('../data');

module.exports = new Xmpp(config.xmpp, data.state);