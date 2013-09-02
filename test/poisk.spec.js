/* global describe, it, expect, beforeEach, afterEach */

'use strict';

var testHelper = require('./testHelper.js');
var proxyquire = require('proxyquire');

testHelper.logErrorOnUncaughtException();


var stateMock = {
  reset: function () {
    this.poisk = {
      lastETag: '"some tag"',
      keyHolder: []
    };
  },

  get: function () {
    return {
      poisk: stateMock.poisk
    };
  }
};

var httpMock = {
  optionsParam: undefined,
  res: undefined,
  req: undefined,
  get: undefined,

  reset: function () {
    this.get = function (options, fn) {
      this.optionsParam = options;
      fn(this.res);
      return this.req;
    };
  }
};

function makeDefaultConfig() {
  return {
    enabled: false,
    apiEndpoint: 'ae',
    pollInterval: 1234
  };
}

var Poisk = proxyquire('./../server/backend/service/poisk.js', {
  'http': httpMock,
  'https': httpMock,
  './../aspects/loggerFactory.js': testHelper.loggerMock(true)
});


describe('?', function () {
  beforeEach(function () {
    stateMock.reset();
    httpMock.reset();
  });


  it('should use the correct config', function () {
    var conf = makeDefaultConfig();

    var o;
    httpMock.get = function (options) {
      o = options;
      return {
        on: function () {
          // ignore
        }
      };
    };
    stateMock.poisk.lastETag = 'foofoo';
    var p = new Poisk(conf, stateMock);

    p._updatePoisk(function () {
    });
    expect(o.headers['If-None-Match']).toBe('foofoo');
  });
});


// TODO: much more testing!