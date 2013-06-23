'use strict';

var LOG = require('./../aspects/loggerFactory.js').logger();
var amanda = require('amanda')('json');


var ApiUtils = {

  /**
   * Util functio to send json data, with a nocache header and allowing all origins
   * @param res
   * @param statusCode
   * @param jsonData
   */
  sendJson: function (res, statusCode, jsonData) {
    if (!jsonData) {
      jsonData = statusCode;
      statusCode = 200;
    }

    // set proper headers
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    res.json(statusCode, jsonData);
  },

  getIpFromRequest: function (req) {
    return req.get('x-forwarded-for') || req.connection.remoteAddress;
  },

// return true for a valid psk or false else
  handlePsk: function (req, res, password) {
    //var pskValue = req.param('psk');
    //    var pskValue = req.body && req.body.psk;
    var pskValue = req.get('Authorization');

    // for the hackerz
    if (pskValue === '0118-999-881-999-119-725~3~') {
      LOG.info('fake psk value detected! IP: ' + ApiUtils.getIpFromRequest(req) + ' Redirecting the client...');
      res.redirect(300, 'http://www.kreativitaet-trifft-technik.de/mitgliedschaft');
      return false;
    }

    // the actual pw check
    if (pskValue !== password) {
      LOG.warn('IP: ' + ApiUtils.getIpFromRequest(req) + ', invalid psk: ' + pskValue);
      ApiUtils.sendJson(res, 400, { status: 'error', msg: 'Invalid Authorization.' });
      return false;
    }

    return true;
  },

  /**
   * Validates the requist against the given schema. If the psk is set and a string, the authorization is also tested.
   * @param req
   * @param res
   * @param schema
   * @param psk the pre shared key. Provide a string containing the password here to test for this.
   * @param callback(err)
   */
  validateRequest: function (req, res, schema, psk, callback) {
    if (typeof psk === 'string') {
      // check the authorization
      if (!ApiUtils.handlePsk(req, res, psk)) {
        callback('invalid psk');
        return;
      }
    } else if (typeof psk === 'function') {
      // no psk was provided, but psk is a function
      callback = psk;
    }

    if (!req.body && req.get('Content-Type') !== 'application/json') {
      LOG.debug('Invalid content type sent for ', req.url);
      ApiUtils.sendJson(res, 400, { status: 'error', msg: 'Invalid Content-Type! Uye application/json and send json data.' });
      callback('Invalid Content-Type!');
      return;
    }

    // patch the schema, because there is a bug in amanda
    // https://github.com/Baggz/Amanda/issues/56
    // with this patch, we allow any other properties, but we don't get a mising callback....
    schema.additionalProperties = {};

    amanda.validate(req.body, schema, function (err) {
      if (err) {
        LOG.debug('Failed validation for ', req.url, err[0].message);
        ApiUtils.sendJson(res, 400, { status: 'error', msg: 'Invalid request: ' + err[0].message});
        callback(err[0].message);
        return;
      }
      callback();
    });
  }

};


module.exports = ApiUtils;