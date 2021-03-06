'use strict';

var path = require('path');
var _ = require('lodash');

function requiredProcessEnv(name) {
  if (!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable');
  }
  return process.env[name];
}

// All configurations will extend these options
// ============================================
var all = {
  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.PORT || 9000,

  stateFile: 'state.json',

  db: {
    host: '',
    database: '',
    user: '',
    password: ''
  },

  mqtt: {
    enabled: false,
    url: 'mqtt://your_server',
    extras: {},
    devicesTopic: '/net/devices',
    stateTopic: {
      space: '/access-control-system/space-state',
      spaceNext: '/access-control-system/space-state-next',
      radstelle: '/access-control-system/radstelle-state',
      lab3d: '/access-control-system/3dlab-state'
    },
    energyTopic: {
      front: '/sensor/energy/front',
      back: '/sensor/energy/back'
    },
    spaceInternalBrokerTopic: '$SYS/broker/connection/spacegate.mainframe.lan/state',
    username: '...',
    password: '...'
  },

  poisk: {
    enabled: false,
    apiEndpoint: '... some endpoint ...',
    pollInterval: 5 * 60 * 1000 // in ms; how often is the poisk service called?
  },

  spaceDevices: {
    clearEntriesAfter: 30 * 60 * 1000, // after this time in ms, all entries will be cleared
    dbUpdateTime: 15 * 60 * 1000 // after this time in ms, we update the state into the db (if changed)
  },

  twitter: {
    mocking: false, // if true, it does everthing except the actual tweet. Useful for developing.
    enabled: false,
    twitterdelay: 3 * 60 * 1000, // delay tweeting after space state change for this long; it's also the minimum time between two tweets
    tweetClosingState: true, // if true, a closing tweet will be sent
    // twitter auth
    auth: {
      consumer_key: '',
      consumer_secret: '',
      access_token_key: '',
      access_token_secret: ''
    }
  },

  xmpp: {
    enabled: false,
    client: {
      jid: '',
      password: '',
      host: '',
      port: 5222,
      reconnect: true
    }
  },

  app: {
    psk: '',
    port: 7996,
    behindProxy: false,
    logIp: false,
    'listenersmininterval': 200, // Update listener counts on stream at most every X milliseconds
    'streamkeepaliveinterval': 60 * 60 * 1000, // Send a keepalive event this often
    // save the current state this often (in addition to on shutdown)
    'saveinterval': 5 * 60 * 1000
  }

};

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = _.merge(
  all,
    require('./' + process.env.NODE_ENV + '.js') || {});