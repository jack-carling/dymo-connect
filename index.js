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
    try {
      const response = await fetch(`${this.url}/GetPrinters`, { agent });
      const data = await response.text();

      const parser = new DOMParser();
      const xml = parser.parseFromString(data, 'text/xml');
      const names = xml.getElementsByTagName('Name');
      const models = xml.getElementsByTagName('ModelName');
      const connections = xml.getElementsByTagName('IsConnected');

      let result = [];
      for (let i = 0; i < names.length; i++) {
        result.push({
          name: names[i].childNodes[0].nodeValue,
          model: models[i].childNodes[0].nodeValue,
          connected: connections[i].childNodes[0].nodeValue === 'True' ? true : false,
        });
      }
      return { success: true, data: result };
    } catch (e) {
      return { success: false };
    }
  }

  static async renderLabel(xml) {
    try {
      const body = `&labelXml=${xml}`;
      const response = await fetch(`${this.url}/RenderLabel`, {
        agent,
        body,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const data = await response.text();
      const result = 'data:image/png;base64,' + data.slice(1, -1);
      return { success: true, data: result };
    } catch (e) {
      return { success: false };
    }
  }
}

module.exports = Dymo;
