/*
 This api outputs the desired status and holds the connection. Any further status update will pushed to the connected clients.
 */

'use strict';

var apiUtils = require(('./apiUtils.js'));

module.exports = function (app, data, config, srv) {

  app.namespace('/statusStream', function () {

    app.get('/', function (req, res) {

      var messageCount = 0;
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
      var events = srv.events;

      var listenerAdded = false;

      [
        [events.EVENT.SPACE_OPEN, 'status'],
        [events.EVENT.SPACE_DEVICES, 'spaceDevices'],
        [events.EVENT.FREIFUNK, 'freifunk'],
        [events.EVENT.WEATHER, 'weather']
      ].forEach(function (event) {
          var eventName = event[0];
          var stateName = event[1];
          if (req.param(eventName) === '1') {
            writeEvent(res, eventName, messageCount++, JSON.stringify(data.state.get()[stateName]));
            events.on(eventName, callback);
            listenerAdded = true;
          }
        });

      if (!listenerAdded) {
        clearInterval(keepAliveIntervalHandle);
        res.write(JSON.stringify({ status: 'ok', message: 'You have no topics selected.'}));
        res.end();
        return;
      }

      req.once('close', function () {
        events.removeAll(callback);
        clearInterval(keepAliveIntervalHandle);
      });


    }); // end get
  });
};

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
  res.write('\n');
}

function writeEvent(res, channel, messageId, message) {
  res.write('event: ' + channel + '\n' + 'id: ' + messageId + '\n' + 'data: ' + message + '\n\n');
}