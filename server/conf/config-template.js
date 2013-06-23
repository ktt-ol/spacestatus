/**
 * Copy this file to config.js and add the configuration with the correct values
 */

module.exports = {
  stateFile: 'state.json',

  db: {
    user: '',
    password: ''
  },

  spaceDevices: {
    clearEntriesAfter: 30 * 60 * 1000, // after this time in ms, all entries will be cleared
    dbUpdateTime: 15 * 60 * 1000, // after this time in ms, we update the state into the db (if changed)
    list: [
      {
        name: 'I am shy',
        mode: 'hidden',
        devices: [ 'abc', '123' ]
      },
      {
        name: 'Show Me',
        mode: 'visible',
        devices: [ 'foo', 'bar']
      },
      {
        name: 'internal devices',
        mode: 'ignore',
        devices: ['1', '2', '3']
      }
    ]
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
    'listenersmininterval': 200, // Update listener counts on stream at most every X milliseconds
    'streamkeepaliveinterval': 60 * 60 * 1000, // Send a keepalive event this often
    // save the current state this often (in addition to on shutdown)
    'saveinterval': 5 * 60 * 1000
  }
};
