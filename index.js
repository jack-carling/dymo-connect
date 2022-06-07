'use strict';

const fetch = require('cross-fetch');
const https = require('https');

const { DOMParser } = require('@xmldom/xmldom');

const agent = new https.Agent({
  rejectUnauthorized: false,
});

class Dymo {
  constructor() {}

  static get url() {
    return 'https://127.0.0.1:41951/DYMO/DLS/Printing';
  }

  static async getPrinters() {
    const response = await fetch(`${this.url}/GetPrinters`, { agent });
    const data = await response.text();
  }
}

module.exports = Dymo;
