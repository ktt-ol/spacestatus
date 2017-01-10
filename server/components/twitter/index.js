'use strict';

var ntwitter = require('ntwitter');
var util = require('util');
var LOG = require('../logger/loggerFactory.js').logger();
var C = require('../../common/constants');

var PLACE_TPL = {};
PLACE_TPL[C.PLACE_SPACE] = 'Der Mainframe';
PLACE_TPL[C.PLACE_RADSTELLE] = 'Die Radstelle';
PLACE_TPL[C.PLACE_3D_LAB] = 'Das 3DLab';
var TWEET_TEMPLATES = {
  'isOpen': '%s ist seit %s Uhr geöffnet, kommt vorbei! Details unter http://goo.gl/MhDwp.',
  'isClosed': '%s ist leider seit %s Uhr geschlossen. Details unter http://goo.gl/MhDwp.',
  'isClosing': '%s schließt gleich! Details unter http://goo.gl/MhDwp.'
};

/**
 * Conains all the twitter specific logic. On any state change, this module will send a tweet if the following conditions are
 * true: - todo
 */
function Twitter(twitterConfig, stateHandler) {
  this._twitter = null;
  this._callbackHandle = null;

  /* functions */

  // from underscore
  function isObject(obj) {
    return obj === Object(obj);
  }

  this._init = function () {
    // validate config
    twitterConfig.enabled = !!twitterConfig.enabled;
    twitterConfig.twitterdelay = twitterConfig.twitterdelay || 1000; // a timestamp in ms

    // validate last state
    var state = this._getTwitterState();
    if (!isObject(state.lastStateTwittered)) {
      state.lastStateTwittered = {};
    }
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

  this.sendTwitterForSpaceStatus = function (newState, place) {
    var internalState = this._toInternalState(newState);

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

      if (state.lastStateTwittered[place] === internalState) {
        LOG.debug('I don´t twitter the same status twice!');
        return;
      }

      var current = new Date();
      var formattedTime = current.getHours() + ':' + (current.getMinutes() < 10 ? '0' : '') + current.getMinutes();
      var msg = TWEET_TEMPLATES[internalState];
      var tweet = util.format(msg, PLACE_TPL[place], formattedTime);
      LOG.debug('Sending tweet for state ' + internalState);

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

      state.lastStateTwittered[place] = internalState;


    }, twitterConfig.twitterdelay);
  };

  this._init();
}

var config = require('../../config/environment');
var data = require('../data');
module.exports = new Twitter(config.twitter, data.state);