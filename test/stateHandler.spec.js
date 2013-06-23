/* global describe, it, expect */


'use strict';

var testHelper = require('./testHelper.js');
var proxyquire = require('proxyquire');

testHelper.logErrorOnUncaughtException();

var readFileSyncMockFn, writeFileMockFn;
var StateHandler = proxyquire('./../server/backend/data/state.js', {
  'fs': {
    readFileSync: function () {
      return readFileSyncMockFn.apply(this, arguments);
    },
    writeFile: function () {
      return writeFileMockFn.apply(this, arguments);
    },
    existsSync: function() {
      return true;
    }
  },
  './../aspects/loggerFactory.js': testHelper.loggerMock()
});

describe('Tests for configuration and initialisation', function () {
  it('should fail on missing or invalid state file.', function () {
    expect(function () {
      new StateHandler();
    }).toThrow();
    expect(function () {
      new StateHandler('');
    }).toThrow();
    expect(function () {
      new StateHandler(42);
    }).toThrow();
  });

  it('every instance should be isolated.', function () {
    var s1 = new StateHandler('testState.json');
    expect(s1._state.status.until).toBe(0);
    s1._state.status.until = 42;
    expect(s1._state.status.until).toBe(42);

    var s2 = new StateHandler('testState2.json');
    expect(s2._state.status.until).toBe(0);
  });
});

describe('Tests for get/load/save', function () {
  it('return the current state with get', function () {
    var s = new StateHandler('testState.json');
    expect(s.get().freifunk.client_count).toBe(0);
    s._state.freifunk.client_count = 23;
    expect(s.get().freifunk.client_count).toBe(23);

    expect(s.get().status.until).toBe(0);
    s.get().status.until = 42;
    expect(s.get().status.until).toBe(42);
    expect(s._state.status.until).toBe(42);

    s.get().status.until++;
    expect(s.get().status.until).toBe(43);
  });

  it('should throw a specific error for invalid state file content', function () {
    readFileSyncMockFn = function (fileToRead, options) {
      return '{"status":{"until":111}'; // missing }
    };
    var s = new StateHandler('testFile');
    expect(s.load).toThrow();
  });

  it('should load new state and replace the old state', function () {
    readFileSyncMockFn = function (fileToRead, options) {
      expect(fileToRead).toBe('testFile');
      return '{"status":{"until":111}, "newValue": "exists"}';
    };

    var s = new StateHandler('testFile');
    // alter the state
    s.get().foo = 'bar';
    s.get().status.until = 37;
    s.load();

    // should be the same
    expect(s.get().foo).toBe('bar');
    // should be replaced
    expect(s.get().status.until).toBe(111);
    // should be new
    expect(s.get().newValue).toBe('exists');
  });

  it('should save the state', function () {
    var fnCalled = false;
    writeFileMockFn = function (fileName, content, options, callback) {
      fnCalled = true;
      expect(fileName).toBe('testFile');
      var contentJson = JSON.parse(content);
      // check for custom values
      expect(contentJson.someValueX2).toBe('bar');
      expect(contentJson.status.until).toBe(37);
      // check for default values
      expect(contentJson.status.timestamp).toBe(0);

      callback();
    };

    var s = new StateHandler('testFile');
    // alter the state
    s.get().someValueX2 = 'bar';
    s.get().status.until = 37;
    var saveCallbackCalled = false;
    s.save(function () {
      saveCallbackCalled = true;
    });
    expect(saveCallbackCalled).toBe(true);
    expect(fnCalled).toBe(true);
  });
});

describe('Tests the autoSave function', function () {
  it('should fail on too small timeouts', function () {
    var s = new StateHandler('testFile');
    expect(s.enableAutoSave.bind()).toThrow();
    expect(s.enableAutoSave.bind('sdlfksdf')).toThrow();
    expect(s.enableAutoSave.bind(1)).toThrow();
    expect(s.enableAutoSave.bind(1000)).toThrow();
  });

  it('should call the save function', function () {
    var s = new StateHandler('testFile');
    s.get().newValue = 'foobar';

    // mock the normal save function
    var fnCalled = true;
    writeFileMockFn = function (fileName, content, options, callback) {
      fnCalled = true;
      expect(fileName).toBe('testFile');
      var contentJson = JSON.parse(content);
      // check for custom values
      expect(contentJson.newValue).toBe('foobar');
      callback();
    };

    // mock the setTimeout
    var firstRun = true;
    testHelper.mockSetTimeout(function (fn, timeout) {
      expect(timeout).toBe(1001);
      // only call the function once to avoid an infinite loop
      if (firstRun) {
        firstRun = false;
        fn();
      }
    });
    s.enableAutoSave(1001);

    expect(firstRun).toBe(false);
    expect(fnCalled).toBe(true);

    testHelper.restoreSetTimeout();
  });
});