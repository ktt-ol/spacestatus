/* global describe, it, expect */

'use strict';

var testHelper = require('./testHelper.js');
var proxyquire = require('proxyquire');

testHelper.logErrorOnUncaughtException();

var onMockFn;
var sendMockFn;
var Xmpp = proxyquire('./../server/backend/service/xmpp.js', {
  'node-xmpp' : {
    Client : function() {
      this.on = onMockFn;
      this.send = sendMockFn;
    },
    Element : function(arg0, arg1) {
      this.arg0 = arg0;
      this.arg1 = arg1;
      
      this.node = [];
      this.text = [];
      this.c = function(node) {
        this.node.push(node);
        return this;
      };
      this.t = function(text) {
        this.text.push(text);
        return this;
      };
      this.up = function() {
        return this;
      };
    }
  },
  './../aspects/loggerFactory.js': testHelper.loggerMock()
});

var stateMock = {
  mockState: 'on',
  get: function() {
    return {
      status: {
        state: stateMock.mockState
      }
    };
  }
};

describe('Tests the config and init function.', function() {
  it('should do nothing if disabled', function() {
    onMockFn = function(element) {
      throw new Error('´on´ not expected');
    };

    var x = new Xmpp({
      enabled : false
    });
  });

  it('should connect and reply to stanzas', function() {
    var callbacks = {};
    var events = {};
    // this mock object mainly saves callback fn for many events and memorizes what event was called
    onMockFn = function(event, fn) {
      switch (event) {
      case 'online':
        events.online = true;
        // save the callback for later
        callbacks.online = fn;
        break;
      case 'error':
        events.error = true;
        break;
      case 'stanza':
        events.stanza = true;
        // we save the callback fn to test it later
        callbacks.stanza = fn;
        break;
      default:
        throw new Error('unexpected event: ' + event);
      }
    };
    // same here for the send function
    var recievedMessages = [];
    sendMockFn = function(element) {
      recievedMessages.push(element);
    };

    // all mocks created, start the test
    var x = new Xmpp({
      enabled : true
    }, stateMock);

    // testing connection
    expect(x.isConnected()).toBe(false);
    callbacks.online();
    expect(x.isConnected()).toBe(true);

    // send some test stanzas
    // stanza: presence
    expect(callbacks.stanza).not.toBeNull();
    expect(recievedMessages.length).toBe(1);
    expect(recievedMessages[0].arg0).toBe('presence');
    expect(recievedMessages[0].node.length).toBe(2);

    callbacks.stanza({
      name : 'presence',
      attrs : {
        type : 'subscribe',
        to : 'foo',
        from : 'bar'
      }
    });
    expect(recievedMessages.length).toBe(2);
    expect(recievedMessages[1].arg0).toBe('presence');
    expect(recievedMessages[1].arg1.to).toBe('bar');

    // stanza: message
    recievedMessages = [];
    var testStanza = {
      name : 'message',
      attrs : {
        from : 'someone@domain.com',
        type : 'chat'
      },
      getChild: function() {
        return {
          getText: function() {
            return 'foo';
          }
        };
      }
    };
    callbacks.stanza(testStanza);
    expect(recievedMessages.length).toBe(1);

    // all events should have been called
    expect(events.online).toBe(true);
    expect(events.error).toBe(true);
    expect(events.stanza).toBe(true);
  });
});

describe('Tests the update function ', function() {
  it('should only accept valid open status.', function() {
    var x = new Xmpp({
      enabled : false
    });
    expect(x.updateForSpaceStatus.bind(x)).toThrow();
    expect(x.updateForSpaceStatus.bind(x, 'foo')).toThrow();
    expect(x.updateForSpaceStatus.bind(x, 'on')).not.toThrow();
    expect(x.updateForSpaceStatus.bind(x, 'off')).not.toThrow();
    expect(x.updateForSpaceStatus.bind(x, 'closing')).not.toThrow();
  });

  it('should do nothing if disabled.', function() {
    sendMockFn = function(element) {
      throw new Error('send should not be called');
    };
    var x = new Xmpp({
      enabled : false
    });
    expect(x.updateForSpaceStatus.bind(x, 'on')).not.toThrow();
  });
  
  it('should send a message correctly', function() {
    var lastElement = null;
    // mockup function to save the sent elements
    sendMockFn = function(element) {
      lastElement = element;
    };
    // simple mockup function to enable the start 
    onMockFn = function(event, fn) {
      if (event === 'online') {
        fn();
      }
    };

    stateMock.mockState = 'off';
    var x = new Xmpp({
      enabled : true
    }, stateMock);
    expect(x.isConnected()).toBe(true);

    expect(lastElement).not.toBeNull();
    expect(lastElement.node[0]).toBe('show');
    expect(lastElement.node[1]).toBe('status');
    expect(lastElement.text[0]).toBe('xa');
    expect(lastElement.text[1]).toContain('geschlossen');

    // test open message
    expect(x.updateForSpaceStatus.bind(x, 'on')).not.toThrow();
    expect(lastElement).not.toBeNull();
    expect(lastElement.node[0]).toBe('show');
    expect(lastElement.node[1]).toBe('status');
    expect(lastElement.text[0]).toBe('chat');
    expect(lastElement.text[1]).toContain('geoeffnet');
    
    // test close message
    lastElement = null;
    expect(x.updateForSpaceStatus.bind(x, 'closing')).not.toThrow();
    expect(lastElement).not.toBeNull();
    expect(lastElement.node[0]).toBe('show');
    expect(lastElement.node[1]).toBe('status');
    expect(lastElement.text[0]).toBe('away');
    expect(lastElement.text[1]).toContain('schließt');
  });
  
  
});
