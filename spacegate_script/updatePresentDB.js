#!/usr/bin/env node

/**
 * A node.js shell script to update the space status present db with current devices.
 * Does the following steps:
 * 1. Gets the current arp cache
 * 2. arping every entry
 * 3. Sends the resulting list of active mac addresses to the status server
 *
 * @author: Holger Cremer
 */

'use strict';
console.log('working as shell script!');

