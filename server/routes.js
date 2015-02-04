/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');

module.exports = function(app) {

  app.use('/', require('./api/legacyApiCall.js'));

  // Insert routes below
  app.use('/api/weather', require('./api/weather'));
  app.use('/api/time', require('./api/time'));
  app.use('/api/powerUsage', require('./api/powerUsage'));
  app.use('/api/statusStream', require('./api/statusStream'));
  app.use('/api/spaceInfo', require('./api/spaceInfo'));
  app.use('/api/twitterAnnouncement', require('./api/twitterAnnouncement'));
  app.use('/api/openStatistics', require('./api/openStatistics'));
  app.use('/api/openState', require('./api/openState'));
  app.use('/api/freifunk', require('./api/freifunk'));
  app.use('/api/spaceDevices', require('./api/spaceDevice'));

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    .get(function(req, res) {
      res.sendfile(app.get('appPath') + '/index.html');
    });
};
