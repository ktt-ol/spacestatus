'use strict';


module.exports = {
  init: function (app, data, config, srv) {

    // must be the first
    require('./legacyApiCall.js')(app, data, config, srv);

    app.namespace('/api', function () {
      require('./freifunk.js')(app, data, config, srv);
      require('./openState.js')(app, data, config, srv);
      require('./openStatistics.js')(app, data, config, srv);
      require('./spaceDevices.js')(app, data, config, srv);
      require('./powerUsage.js')(app, data, config, srv);
      require('./spaceInfo.js')(app, data, config, srv);
      require('./statusStream.js')(app, data, config, srv);
      require('./time.js')(app);
      require('./twitterAnnouncement.js')(app, data, config, srv);
      require('./weather.js')(app, data, config, srv);
    });

  }
};