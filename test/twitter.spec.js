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
  twitterinterval: 1,
  twitterdelay: 10000
};

describe('Tests for the twitter action, ', function () {
  beforeEach(function () {
    testHelper.mockSetTimeout();
  });

  afterEach(function () {
    testHelper.restoreSetTimeout();
  });

  it('should doesn´t change on external changes', function () {
    var extConfig = {
      enabled: 0,
      foo: 'bar'
    };
    var extState = {
      foo: 'bar'
    };
    var t = new Twitter(extConfig, extState);
    // check for default value
    expect(t._config.enabled).toBe(false);
    expect(t._config.twitterdelay).toBe(1000);
    expect(t._state.lastTweetSendAt).toBe(0);
    // check for same values as external
    expect(t._config.foo).toBe('bar');
    expect(t._state.foo).toBe('bar');

    // mode external changes and check again
    extConfig.foo = 'not bar anymore';
    extState.foo = 'also not bar anymore';
    expect(t._config.foo).toBe('bar');
    expect(t._state.foo).toBe('bar');
  });

  it('should enable and disable', function () {
    var t = new Twitter({});
    expect(t.isEnabled()).toBe(false);
    t = new Twitter(config);
    expect(t.isEnabled()).toBe(true);

    t.disable();
    expect(t.isEnabled()).toBe(false);

    t.enable();
    expect(t.isEnabled()).toBe(true);
  });

  it('should fail on all the wrong status', function () {
    var t = new Twitter(config);
    expect(t.sendTwitterForSpaceStatus).toThrow();
    expect(t.sendTwitterForSpaceStatus.bind(t, true)).toThrow();
    expect(t.sendTwitterForSpaceStatus.bind(t, 'blah')).toThrow();
  });

  it('should tweet the correct status', function () {
    var t = new Twitter(config);

    updateStatusMockFn = function (tweet) {
      expect(tweet).toContain('geöffnet');
    };
    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();

    t = new Twitter(config);
    updateStatusMockFn = function (tweet) {
      expect(tweet).toContain('geschlossen');
    };
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();

    t = new Twitter(config);
    updateStatusMockFn = function (tweet) {
      expect(tweet).toContain('schließt gleich');
    };
    expect(t.sendTwitterForSpaceStatus.bind(t, 'closing')).not.toThrow();
  });

  it('should not tweet if disabled', function () {
    var t = new Twitter(config);
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

    var t = new Twitter({
      enabled: true,
      twitterdelay: 10000
    }, {
      lastStateTwittered: 'off',
      lastTweetSendAt: 0
    });
    // test init state
    expect(t._state.lastTweetSendAt).toBe(0);

    // status change should work
    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();
    expect(callCounter).toBe(1);
    var lastTime = t._state.lastTweetSendAt;
    expect(lastTime - 1).toBeLessThan(Date.now());

    // should not work
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(1);
    expect(t._state.lastTweetSendAt).toBe(lastTime);

    // should work, after internal state manipulation
    t._state.lastTweetSendAt -= 10000 + 1;
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(2);
  });

  it('should not tweet if the last twitter state doesnT fit.', function () {
    var callCounter = 0;
    updateStatusMockFn = function (tweet) {
      callCounter++;
    };

    var t = new Twitter({
      enabled: true,
      twitterdelay: 1
    }, {
      lastStateTwittered: 'off',
      lastTweetSendAt: 0
    });

    // should not work
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(0);
    // modify the internal time, because we are too fast for date.now
    t._state.lastTweetSendAt -= 2;
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(0);

    // should work
    expect(t.sendTwitterForSpaceStatus.bind(t, 'on')).not.toThrow();
    expect(callCounter).toBe(1);
    // modify the internal time, because we are too fast for date.now
    t._state.lastTweetSendAt -= 2;
    expect(t.sendTwitterForSpaceStatus.bind(t, 'off')).not.toThrow();
    expect(callCounter).toBe(2);
  });

});
