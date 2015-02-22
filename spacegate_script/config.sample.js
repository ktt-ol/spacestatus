'use strict';

module.exports = {
  debug: false,

  device: '/proc/net/arp',
  arping: '/usr/sbin/arping',
  lanDevice: 'eth1',

  mqtt: {
    server: 'tls://your_server',
    ca: 'your_cert.crt',
    topic: '/net/devices',
    username: 'user',
    password: 'pw'
  },

  pings: 3
};