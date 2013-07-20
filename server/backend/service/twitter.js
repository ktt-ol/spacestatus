/**
 * Conains all the twitter specific logic. On any state change, this module will send a tweet if the following conditions are
 * true: - todo
 */

'use strict';

var ntwitter = require('ntwitter');
var util = require('util');
var LOG = require('./../aspects/loggerFactory.js').logger();

module.exports = Twitter;

var TWEET_TEMPLATES = {
  'on': 'Der Mainframe ist seit %s Uhr geöffnet, kommt vorbei! Details unter http://goo.gl/MhDwp.',
  'off': 'Der Mainframe ist leider seit %s Uhr geschlossen. Details unter http://goo.gl/MhDwp.',
  'closing': 'Der Mainframe schließt gleich! Details unter http://goo.gl/MhDwp.'
};

function Twitter(twitterConfig, stateHandler) {
  this._twitter = null;
  this._callbackHandle = null;

  /* functions */

  this._init = function () {
    // validate config
    twitterConfig.enabled = !!twitterConfig.enabled;
    twitterConfig.twitterdelay = twitterConfig.twitterdelay || 1000; // a timestamp in ms

    // validate last state
    var state = this._getTwitterState();
    state.lastStateTwittered = state.lastStateTwittered || null;
    state.lastTweetSendAt = state.lastTweetSendAt || 0;
    state.enabled = !!state.enabled;

    if (!twitterConfig.enabled || !state.enabled) {
      return;
    }

    this._initTwitter();
  };

  this._initTwitter = function () {
    // create twitter object
    this._twitter = new ntwitter(twitterConfig.auth);
    this._getTwitterState().enabled = true;
    LOG.info('Twitter is enabled and initialized.');
  };

  this._getTwitterState = function () {
    return stateHandler.get().twitter;
  };

  this.isEnabled = function () {
    return twitterConfig.enabled && this._getTwitterState().enabled;
  };

  this.enable = function () {
    if (!twitterConfig.enabled) {
      LOG.info('I can´t enable Twitter, because it´s disabled by config.');
      return;
    }

    if (this._getTwitterState().enabled) {
      // nothing to do
      return;
    }

    this._initTwitter();
  };

  this.disable = function () {
    this._getTwitterState().enabled = false;
    this._twitter = null;

    if (this._callbackHandle) {
      clearTimeout(this._callbackHandle);
      this._callbackHandle = null;
    }

    LOG.info('Twitter is disabled.');
  };

  this.sendTwitterForSpaceStatus = function (newState) {
    if (newState !== 'on' && newState !== 'off' && newState !== 'closing') {
      throw new Error('Unknown newState. Please use on/off/closing.');
    }

    if (this._callbackHandle) {
      clearTimeout(this._callbackHandle);
      this._callbackHandle = null;
    }

    // don't twitter now, wait some time
    var self = this;
    this._callbackHandle = setTimeout(function () {
      var state = self._getTwitterState();
      if (!state.enabled) {
        return;
      }

      if (state.lastTweetSendAt + twitterConfig.twitterdelay > Date.now()) {
        LOG.debug('I don´t tweet, because I´ve just sent another tweet.');
        return;
      }

      if (state.lastStateTwittered === newState) {
        LOG.debug('I don´t twitter the same status twice!');
        return;
      }

      var current = new Date();
      var formattedTime = current.getHours() + ':' + (current.getMinutes() < 10 ? '0' : '') + current.getMinutes();
      var msg = TWEET_TEMPLATES[newState];
      var tweet = util.format(msg, formattedTime);
      LOG.debug('Sending tweet for state ' + newState);

      var session = self._twitter.verifyCredentials(function (err, data) {
        if (err) {
          LOG.error('Invalid twitter credentials:', err);
        }
      });
      if (twitterConfig.mocking) {
        LOG.info('MOCKING: sending tweet `' + tweet + '´');
      } else {
        session.updateStatus(tweet, function (err, data) {
          if (err) {
            LOG.error('Error sending tweet: ', err);
          }
        });
      }

      state.lastStateTwittered = newState;
      state.lastTweetSendAt = Date.now();


    }, twitterConfig.twitterdelay);
  };

  this._init();
}
