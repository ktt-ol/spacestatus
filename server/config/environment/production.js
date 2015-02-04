'use strict';

// Production specific configuration
// =================================
module.exports = {
  // Server IP
  ip: process.env.OPENSHIFT_NODEJS_IP ||
    process.env.IP ||
    undefined,

  // Server port
  port: process.env.OPENSHIFT_NODEJS_PORT ||
    process.env.PORT ||
    7996,

  twitter: {
    enabled: true,
    mocking: false
  },

  xmpp: {
    enabled: true
  },

  logger: {
    'appenders': [
      {
        'type': 'file',
        'filename': 'logs/express_access.log',
        'maxLogSize': 5000000,
        'backups': 3,
        'category': 'express_access'
      },
      {
        'type': 'file',
        'filename': 'logs/app.log',
        'maxLogSize': 5000000,
        'backups': 3,
        'category': 'app'
      }
    ],
    'levels': {
      'express_access': 'DEBUG',
      'app': 'DEBUG'
    }
  }

};