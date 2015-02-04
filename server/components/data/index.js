'use strict';

var config = require('../../config/environment');

var data = {};
data.db = require('./db.js')(config);

var StateFileHandler = require('./state.js');
data.state = new StateFileHandler(config.stateFile);
data.state.load();
data.state.enableAutoSave(config.app.saveinterval);

require('./poisk.js')(config.poisk, data.state);


module.exports = data;