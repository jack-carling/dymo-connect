'use strict';

const fetch = require('cross-fetch');

const { DOMParser } = require('@xmldom/xmldom');

class Dymo {
  constructor() {}

  static get url() {
    return 'https://127.0.0.1:41951/DYMO/DLS/Printing';
  }

  static async getPrinters() {
    try {
      if (typeof process !== 'undefined' && process.env) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
      const response = await fetch(`${this.url}/GetPrinters`);
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
      return { success: false, data: e };
    }
  }

  static async renderLabel(xml) {
    try {
      const body = `labelXml=${xml}`;
      if (typeof process !== 'undefined' && process.env) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
      const response = await fetch(`${this.url}/RenderLabel`, {
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
      return { success: false, data: e };
    }
  }

  static async printLabel(printer, xml) {
    try {
      const body = `printerName=${printer}&labelXml=${xml}`;
      if (typeof process !== 'undefined' && process.env) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
      const response = await fetch(`${this.url}/PrintLabel`, {
        body,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const result = await response.text();
      if (result !== 'true') return { success: false, data: result };

      return { success: true };
    } catch (e) {
      return { success: false, data: e };
    }
  }
}

module.exports = Dymo;
