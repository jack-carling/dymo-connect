import { XMLParser } from 'fast-xml-parser';
import https from 'https';

interface Printer {
  name: string;
  model: string;
  connected: boolean;
  local: boolean;
  twinTurbo: boolean;
}

interface LabelWriterPrinterResponse {
  Name: string;
  ModelName: string;
  IsConnected: string;
  IsLocal: string;
  IsTwinTurbo: string;
}

interface PrintersResponse {
  Printers: {
    LabelWriterPrinter: Array<LabelWriterPrinterResponse> | LabelWriterPrinterResponse;
  };
}

interface DymoResponse<T> {
  success: boolean;
  data: T | Error;
}

interface UniversalResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

class Dymo {
  private static readonly url: string = 'https://127.0.0.1:41951/DYMO/DLS/Printing';
  private static readonly isNode =
    typeof process !== 'undefined' && process.versions && process.versions.node;

  private static cachedDymoCertificate: string = '';

  private static async fetch(input: RequestInfo, init?: RequestInit) {
    if (this.isNode) {
      const url = new URL(typeof input === 'string' ? input : input.url);
      const dymoCertificate = await this.getDymoCertificate();
      const dymoAgent = new https.Agent({
        ca: dymoCertificate,
        rejectUnauthorized: false,
      });
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: init?.method || 'GET',
        agent: dymoAgent,
      };

      return new Promise<UniversalResponse>((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({
              ok: (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300,
              status: res.statusCode!,
              text: () => Promise.resolve(data),
            });
          });
        });

        req.on('error', (err) => {
          reject(err);
        });

        if (init?.body) {
          req.write(init.body);
        }

        req.end();
      });
    } else {
      const response = await globalThis.fetch(input, init);
      return {
        ok: response.ok,
        status: response.status,
        text: () => response.text(),
      };
    }
  }

  private static async fetchDymoCertificate(): Promise<string> {
    const { Socket } = await import('net');
    const tls = await import('tls');
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      const options = {
        rejectUnauthorized: false,
      };
      const tlsSocket = tls.connect(41951, '127.0.0.1', options, () => {
        const cert = tlsSocket.getPeerCertificate();
        if (!cert.raw) {
          reject(new Error('Failed to fetch certificate'));
          return;
        }
        resolve(
          `-----BEGIN CERTIFICATE-----\n${cert.raw.toString('base64')}\n-----END CERTIFICATE-----`
        );
        tlsSocket.end();
      });
      tlsSocket.on('error', reject);
      socket.on('error', reject);
    });
  }

  private static async getDymoCertificate(): Promise<string> {
    if (this.cachedDymoCertificate) {
      return this.cachedDymoCertificate;
    }
    this.cachedDymoCertificate = await this.fetchDymoCertificate();
    return this.cachedDymoCertificate;
  }

  static async getPrinters(): Promise<DymoResponse<Printer[]>> {
    try {
      const response = await this.fetch(`${this.url}/GetPrinters`);
      const xml = await response.text();

      const parser = new XMLParser();
      const parsedXml: PrintersResponse = parser.parse(xml);

      const printers = Array.isArray(parsedXml.Printers.LabelWriterPrinter)
        ? parsedXml.Printers.LabelWriterPrinter
        : [parsedXml.Printers.LabelWriterPrinter];

      const result: Printer[] = printers.map((printer) => ({
        name: printer.Name,
        model: printer.ModelName,
        connected: printer.IsConnected === 'True',
        local: printer.IsLocal === 'True',
        twinTurbo: printer.IsTwinTurbo === 'True',
      }));

      return { success: true, data: result };
    } catch (e) {
      return { success: false, data: e as Error };
    }
  }

  static async renderLabel(xml: string): Promise<DymoResponse<string>> {
    try {
      const body = `labelXml=${encodeURIComponent(xml)}`;
      const response = await this.fetch(`${this.url}/RenderLabel`, {
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
      const response = await this.fetch(`${this.url}/PrintLabel`, {
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

export default Dymo;
