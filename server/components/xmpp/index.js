'use strict';

var xmpp = require('node-xmpp');
var LOG = require('../logger/loggerFactory.js').logger();
var util = require('util');

var Xmpp = function (xmppConfig, state) {

  var xmppClient = null;
  // is the XMPP client connected?
  var isConnected = false;

  this._init = function () {
    if (!xmppConfig.enabled) {
      return;
    }

    xmppClient = new xmpp.Client(xmppConfig.client);

    var self = this;
    xmppClient.on('online', function () {
      LOG.info('xmpp client is online!');
      isConnected = true;

      self.updateForSpaceStatus(state.get().status.state);
    });
    xmppClient.on('error', function (excp) {
      LOG.error('Error in xmpp client: ' + (excp.message || excp));
    });

    xmppClient.on('stanza', function (stanza) {
      switch (stanza.name) {
      case 'presence':
        if (stanza.attrs.type === 'subscribe') {
          xmppClient.send(new xmpp.Element('presence', {
            'from': stanza.attrs.to,
            'to': stanza.attrs.from,
            type: 'subscribed'
          }));
        }
        break;
      case 'message':
        if (stanza.attrs.type === 'error') {
          return;
        }

        if (stanza.attrs.type === 'chat') {
          var body = stanza.getChild('body');
          if (body !== undefined) {
            var msg;
            if (body.getText() === '?') {
              msg = 'The current status as json: ' +
                JSON.stringify(state.get()) +
                '\nIf you want to have a nice format, send me a patch.';
              reply(msg);
            } else if (body.getText() === 'who') {
              // make a nice formatted string from the data
              msg = state.get().spaceDevices.people.map(function (value) {
                return value.name + '[' + (value.key ? 'X' : '') + ']';
              }).join(', ');
              reply(msg);
            } else {
              msg = 'Available commands:\n' +
                '?   - Dump internal status object in JSON notation\n' +
                'who - Dump list of people detected in space';
              reply(msg);
            }
          }
        }
        break;
      default:
      }

      function reply(msg) {
        var msgElement = new xmpp.Element('message', {
          to: stanza.attrs.from,
          type: 'chat'
        }).c('body').t(msg, false, 3);
        xmppClient.send(msgElement);
      }

    }); // on stanza
  };

  this.isConnected = function () {
    return isConnected;
  };

  this.updateForSpaceStatus = function (spaceStatus) {
    if (spaceStatus !== 'on' && spaceStatus !== 'off' && spaceStatus !== 'closing') {
      throw new Error('Unknown newState. Please use on/off/closing.');
    }

    if (!xmppConfig.enabled || !isConnected) {
      return;
    }

    if (spaceStatus === 'on') {
      this._setPresence('chat', 'Mainframe ist geoeffnet, kommt vorbei!');
    } else if (spaceStatus === 'closing') {
      this._setPresence('away', 'Mainframe schließt gleich!');
    } else {
      // xa = "eXtended Away"
      this._setPresence('xa', 'Mainframe ist leider geschlossen. Bis zum naechsten Mal!');
    }
  };

  this._setPresence = function (show, status) {
    xmppClient.send(new xmpp.Element('presence', {}).c('show').t(show).up().c('status').t(status));
  };

  this._init();
};

var config = require('../../config/environment');
var data = require('../data');

module.exports = new Xmpp(config.xmpp, data.state);