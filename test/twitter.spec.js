/* global describe, it, expect, beforeEach, afterEach */

'use strict';

var testHelper = require('./testHelper.js');
var proxyquire = require('proxyquire');

testHelper.logErrorOnUncaughtException();

var updateStatusMockFn;
var Twitter = proxyquire('./../server/backend/service/twitter.js', {
  'ntwitter': function (config) {
    this.verifyCredentials = function () {
      return {
        updateStatus: updateStatusMockFn
      };
    };
  },
  './../aspects/loggerFactory.js': testHelper.loggerMock()
});

var config = {
  enabled: true,
  twitterdelay: 10000
};

var stateMock = {
  reset: function () {
    this.twitter.lastStateTwittered = null;
    this.twitter.lastTweetSendAt = 0;
    this.twitter.enabled = true;
  },
  twitter: {},
  get: function () {
    return {
      twitter: stateMock.twitter
    };
  }
};

describe('Tests for the twitter action, ', function () {
  beforeEach(function () {
    testHelper.mockSetTimeout();
    stateMock.reset();
  });

  afterEach(function () {
    testHelper.restoreSetTimeout();
  });


  it('should enable and disable', function () {
    var t = new Twitter({}, stateMock);
    expect(t.isEnabled()).toBe(false);
    t = new Twitter(config, stateMock);
    expect(t.isEnabled()).toBe(true);

    t.disable();
    expect(t.isEnabled()).toBe(false);

    t.enable();
    expect(t.isEnabled()).toBe(true);
  });

  it('should fail on all the wrong status', function () {
    var t = new Twitter(config, stateMock);
    expect(t.sendTwitterForSpaceStatus).toThrow();
    expect(t.sendTwitterForSpaceStatus.bind(t, true)).toThrow();
    expect(t.sendTwitterForSpaceStatus.bind(t, 'blah')).toThrow();
  });

  it('should tweet the correct status', function () {
    var t = new Twitter(config, stateMock);

    updateStatusMockFn = function (tweet) {
      expect(tweet).toContain('geöffnet');
    };
    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();

    t = new Twitter(config, stateMock);
    updateStatusMockFn = function (tweet) {
      expect(tweet).toContain('geschlossen');
    };
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();

    t = new Twitter(config, stateMock);
    updateStatusMockFn = function (tweet) {
      expect(tweet).toContain('schließt gleich');
    };
    expect(t.sendTwitterForSpaceStatus.bind(t, 'closing')).not.toThrow();
  });

  it('should not tweet if disabled', function () {
    var t = new Twitter(config, stateMock);
    t.disable();
    expect(t.isEnabled()).toBe(false);

    updateStatusMockFn = function (tweet) {
      throw new Error('test fail');
    };
    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();
  });

  it('should not tweet if last tweet send time is to low', function () {
    var callCounter = 0;
    updateStatusMockFn = function (tweet) {
      callCounter++;
    };

    stateMock.twitter.lastStateTwittered = 'off';
    var t = new Twitter({
      enabled: true,
      twitterdelay: 10000
    },stateMock);

    // test init state
    expect(stateMock.twitter.lastTweetSendAt).toBe(0);

    // status change should work
    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();
    expect(callCounter).toBe(1);
    var lastTime = stateMock.twitter.lastTweetSendAt;
    expect(lastTime - 1).toBeLessThan(Date.now());

    // should not work
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(1);
    expect(stateMock.twitter.lastTweetSendAt).toBe(lastTime);

    // should work, after internal state manipulation
    stateMock.twitter.lastTweetSendAt -= 10000 + 1;
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(2);
  });

  it('should not tweet if the last twitter state doesnT fit.', function () {
    var callCounter = 0;
    updateStatusMockFn = function (tweet) {
      callCounter++;
    };

    stateMock.twitter.lastStateTwittered = 'off';
    var t = new Twitter({
      enabled: true,
      twitterdelay: 1
    }, stateMock);

    // should not work
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(0);
    // modify the internal time, because we are too fast for date.now
    stateMock.twitter.lastTweetSendAt -= 2;
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(0);

    // should work
    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();
    expect(callCounter).toBe(1);
    // modify the internal time, because we are too fast for date.now
    stateMock.twitter.lastTweetSendAt -= 2;
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(2);
  });

  it('should work with saved state', function () {
    var t = new Twitter({
      enabled: true,
      twitterdelay: 10000
    }, stateMock);

    var callCounter = 0;
    updateStatusMockFn = function (tweet) {
      callCounter++;
    };

    expect(t.isEnabled()).toBe(true);
    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();
    expect(callCounter).toBe(1);

    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();
    expect(callCounter).toBe(1);

    // simulating the program restart by creating a new twitter instance
    t = new Twitter({
      enabled: true,
      twitterdelay: 10000
    }, stateMock);
    expect(t.isEnabled()).toBe(true);
    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();
    // should still be 1 !
    expect(callCounter).toBe(1);

    // disable twitter and testing the new instances
    t.disable();

    // simulating the program restart by creating a new twitter instance
    t = new Twitter({
      enabled: true,
      twitterdelay: 10000
    }, stateMock);
    expect(t.isEnabled()).toBe(false);
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(1);

  });

});
