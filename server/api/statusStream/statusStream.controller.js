'use strict';

var url = require('url');
var config = require('../../config/environment');
var events = require('../../components/events');
var data = require('../../components/data');

function writeStreamHeaders(res, req) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  var ua = req.get['user-agent'];
  if (ua && ua.indexOf('MSIE') >= 0) {
    res.write(':' + new Array(2049).join(' ')); // 2kb padding for IE
  }
  res.write('retry: 2000\n');
  res.write('\n');
}

function writeEvent(res, channel, messageId, message) {
  res.write('event: ' + channel + '\n' + 'id: ' + messageId + '\n' + 'data: ' + message + '\n\n');
  res.flush();
}

exports.index = function(req, res) {
  var parsedURL = url.parse(req.url, true);
  var messageCount = Number(req.headers["last-event-id"]) || Number(parsedURL.query.lastEventId) || 0;
  var keepAliveIntervalHandle = null;

  function sendKeepAlive() {
    if (keepAliveIntervalHandle) {
      clearInterval(keepAliveIntervalHandle);
      keepAliveIntervalHandle = null;
    }

    keepAliveIntervalHandle = setInterval(function () {
      writeEvent(res, 'keepalive', messageCount++, 1);
    }, config.app.streamkeepaliveinterval);
  }

  // to get the eventName as first parameter, you have to use 'bind' with this callback function
  function callback(eventName, message) {

    writeEvent(res, eventName, messageCount++, JSON.stringify(message));
    sendKeepAlive();
  }

  req.socket.setTimeout(0);
  writeStreamHeaders(res, req);
  sendKeepAlive();

  var listenerAdded = false;


  Object.keys(events.EVENT).forEach(function(eventNameKey) {
    var eventName = events.EVENT[eventNameKey];
    if (req.param(eventName) === '1') {
      var state;
      if (eventName === events.EVENT.SPACE_OPEN) {
        state = data.state.get().openState.space;
      } else if (eventName === events.EVENT.RADSTELLE_OPEN) {
        state = data.state.get().openState.radstelle;
      } else if (eventName === events.EVENT.LAB_3D_OPEN) {
        state = data.state.get().openState.lab3d;
      } else if (eventName === events.EVENT.MACHINING) {
        state = data.state.get().openState.machining;
      } else {
        state = data.state.get()[eventName];
      }
      writeEvent(res, eventName, messageCount++, JSON.stringify(state));
      events.on(eventName, callback);
      listenerAdded = true;
    }
  });

  if (!listenerAdded) {
    clearInterval(keepAliveIntervalHandle);
    var topics = Object.keys(events.EVENT).map(function (key) {
      return events.EVENT[key];
    }).join(', ');
    res.write(JSON.stringify({ status: 'ok', message: 'You have no topics selected. Use one of ' +  topics}));
    res.end();
    return;
  }

  req.once('close', function () {
    events.removeAll(callback);
    clearInterval(keepAliveIntervalHandle);
  });

};