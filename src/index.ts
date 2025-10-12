import { DOMParser } from '@xmldom/xmldom';

interface Printer {
  name: string;
  model: string;
  connected: boolean;
}

interface DymoResponse<T> {
  success: boolean;
  data: T | Error;
}

export class Dymo {
  private static readonly url: string = 'https://127.0.0.1:41951/DYMO/DLS/Printing';

  static async getPrinters(): Promise<DymoResponse<Printer[]>> {
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

      const result: Printer[] = [];
      for (let i = 0; i < names.length; i++) {
        result.push({
          name: names[i].childNodes[0].nodeValue ?? '',
          model: models[i].childNodes[0].nodeValue ?? '',
          connected: connections[i].childNodes[0].nodeValue === 'True',
        });
      }
      return { success: true, data: result };
    } catch (e) {
      return { success: false, data: e as Error };
    }
  }

  static async renderLabel(xml: string): Promise<DymoResponse<string>> {
    try {
      const body = `labelXml=${encodeURIComponent(xml)}`;
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
      const result = `data:image/png;base64,${data.slice(1, -1)}`;
      return { success: true, data: result };
    } catch (e) {
      return { success: false, data: e as Error };
    }
  }

  static async printLabel(printer: string, xml: string): Promise<DymoResponse<boolean>> {
    try {
      const body = `printerName=${encodeURIComponent(printer)}&labelXml=${encodeURIComponent(xml)}`;
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
      if (result !== 'true') return { success: false, data: new Error(result) };
      return { success: true, data: true };
    } catch (e) {
      return { success: false, data: e as Error };
    }
  }
}
