'use strict';

module.exports = {

  init: function (config) {
    var data = {};

    data.db = require('./db.js')(config);

    var StateFileHandler = require('./state.js');
    data.state = new StateFileHandler(config.stateFile);
    data.state.load();
    data.state.enableAutoSave(config.app.saveinterval);

    return data;
  }

};
