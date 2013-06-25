/**
 * Conains all the twitter specific logic. On any state change, this module will send a tweet if the following conditions are
 * true: - todo
 */

'use strict';

var ntwitter = require('ntwitter');
var util = require('util');
var ce = require('cloneextend');
var LOG = require('./../aspects/loggerFactory.js').logger();

module.exports = Twitter;

var TWEET_TEMPLATES = {
  'on': 'Der Mainframe ist seit %s Uhr geöffnet, kommt vorbei! Details unter http://goo.gl/MhDwp.',
  'off': 'Der Mainframe ist leider seit %s Uhr geschlossen. Details unter http://goo.gl/MhDwp.',
  'closing': 'Der Mainframe schließt gleich! Details unter http://goo.gl/MhDwp.'
};

function Twitter(twitterConfig, oldState) {
  this._twitter = null;
  this._callbackHandle = null;

  // create a clone to be independent from external changes
  this._state = ce.clone(oldState || {});
  this._config = ce.clone(twitterConfig || {});

  // validate config & state
  this._config.enabled = !!this._config.enabled;
  this._config.twitterdelay = this._config.twitterdelay || 1000; // a timestamp in ms
  this._state.lastStateTwittered = this._state.lastStateTwittered || null;
  this._state.lastTweetSendAt = this._state.lastTweetSendAt || 0;

  // init now, if twitter is enabled
  if (!this._config.enabled) {
    return;
  }
  this._init();
}

Twitter.prototype._init = function () {
  // create twitter object
  this._twitter = new ntwitter(this._config.auth);
  this._config.enabled = true;
  LOG.info('Twitter is enabled and initialized.');
};

Twitter.prototype.getState = function () {
  return ce.clone(this._state);
};

Twitter.prototype.isEnabled = function () {
  return this._config.enabled;
};

Twitter.prototype.enable = function () {
  if (this._config.enabled) {
    // nothing to do
    return;
  }

  this._init();
};

Twitter.prototype.disable = function () {
  if (!this._config.enabled) {
    return;
  }

  this._config.enabled = false;
  this._twitter = null;

  if (this._callbackHandle) {
    clearTimeout(this._callbackHandle);
    this._callbackHandle = null;
  }

  LOG.info('Twitter is disabled.');
};

Twitter.prototype.sendTwitterForSpaceStatus = function (newState) {
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
    if (!self._config.enabled) {
      return;
    }

    if (self._state.lastTweetSendAt + self._config.twitterdelay > Date.now()) {
      LOG.debug('I don´t tweet, because I´ve just sent another tweet.');
      return;
    }

    if (self._state.lastStateTwittered === newState) {
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
    if (self._config.mocking) {
      LOG.info('MOCKING: sending tweet `' + tweet + '´');
    } else {
      session.updateStatus(tweet, function (err, data) {
        if (err) {
          LOG.error('Error sending tweet: ', err);
          return;
        }
        LOG.debug('tweet sent ', data);
      });
    }

    self._state.lastStateTwittered = newState;
    self._state.lastTweetSendAt = Date.now();


  }, this._config.twitterdelay);
};
