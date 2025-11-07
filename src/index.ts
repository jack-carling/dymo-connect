import https from 'https';
import type {
  DymoOptions,
  Printer,
  DymoResponse,
  UniversalResponse,
  LabelParameters,
  ConsumableInfo,
} from './types.ts';

class Dymo {
  private cachedDymoCertificate: string = '';
  private url: string;

  constructor(options: DymoOptions = {}) {
    const { hostname = '127.0.0.1', port = 41951 } = options;
    this.url = `https://${hostname}:${port}/DYMO/DLS/Printing`;
  }

  private async fetch(input: RequestInfo, init?: RequestInit) {
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (isNode) {
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
        headers: {},
      };

      if (init?.body) {
        const contentType =
          (init.headers as Record<string, string>)?.['Content-Type'] ||
          'application/x-www-form-urlencoded';
        options.headers = {
          ...options.headers,
          'Content-Type': contentType,
          'Content-Length': Buffer.byteLength(init.body as string),
        };
      }

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

  private async fetchDymoCertificate(): Promise<string> {
    const { Socket } = await import('net');
    const tls = await import('tls');
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      const options = {
        rejectUnauthorized: false,
      };
      const tlsSocket = tls.connect(this.getPort(), this.getIp(), options, () => {
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

  private getIp(): string {
    const url = new URL(this.url);
    return url.hostname;
  }

  private getPort(): number {
    const url = new URL(this.url);
    return parseInt(url.port) || 443;
  }

  private async getDymoCertificate(): Promise<string> {
    if (this.cachedDymoCertificate) {
      return this.cachedDymoCertificate;
    }
    this.cachedDymoCertificate = await this.fetchDymoCertificate();
    return this.cachedDymoCertificate;
  }

  async getPrinters(): Promise<DymoResponse<Printer[]>> {
    try {
      const response = await this.fetch(`${this.url}/GetPrinters`);
      const xml = await response.text();

      const printerRegex = /<LabelWriterPrinter>(.*?)<\/LabelWriterPrinter>/gs;
      const printerMatches = xml.match(printerRegex) || [];

      const result: Printer[] = printerMatches.map((printerXml) => {
        const nameMatch = printerXml.match(/<Name>(.*?)<\/Name>/);
        const name = nameMatch ? nameMatch[1] : '';

        const modelMatch = printerXml.match(/<ModelName>(.*?)<\/ModelName>/);
        const model = modelMatch ? modelMatch[1] : '';

        const isConnectedMatch = printerXml.match(/<IsConnected>(.*?)<\/IsConnected>/);
        const connected = isConnectedMatch ? isConnectedMatch[1] === 'True' : false;

        const isLocalMatch = printerXml.match(/<IsLocal>(.*?)<\/IsLocal>/);
        const local = isLocalMatch ? isLocalMatch[1] === 'True' : false;

        const isTwinTurboMatch = printerXml.match(/<IsTwinTurbo>(.*?)<\/IsTwinTurbo>/);
        const twinTurbo = isTwinTurboMatch ? isTwinTurboMatch[1] === 'True' : false;

        return {
          name,
          model,
          connected,
          local,
          twinTurbo,
        };
      });

      return { success: true, data: result };
    } catch (e) {
      return { success: false, data: e as Error };
    }
  }

  async getConsumableInfo(printer: string): Promise<DymoResponse<ConsumableInfo>> {
    try {
      const query = `?printerName=${encodeURIComponent(printer)}`;
      const url = `${this.url}/GetConsumableInfoIn550Printer${query}`;
      const response = await this.fetch(url);
      const data = await response.text();
      const result = { sku: null, labelsRemaining: 0 };
      if (data.includes('sku')) {
        const parsed = JSON.parse(data);
        result.sku = parsed.sku;
        result.labelsRemaining = parsed.labelsRemaining;
      }
      return { success: true, data: result };
    } catch (e) {
      return { success: false, data: e as Error };
    }
  }

  async renderLabel(xml: string): Promise<DymoResponse<string>> {
    try {
      const body = new URLSearchParams();
      body.append('labelXml', xml);
      const response = await this.fetch(`${this.url}/RenderLabel`, {
        body: body.toString(),
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

  async printLabel(
    printer: string,
    xml: string,
    parameters: LabelParameters = {}
  ): Promise<DymoResponse<boolean>> {
    try {
      const body = new URLSearchParams();
      body.append('printerName', printer);
      body.append('labelXml', xml);
      body.append('printParamsXml', this.createPrintParamsXml(parameters));
      const response = await this.fetch(`${this.url}/PrintLabel`, {
        body: body.toString(),
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

  private createPrintParamsXml(parameters: LabelParameters): string {
    const parameterMappings: Record<string, keyof LabelParameters> = {
      JobTitle: 'jobTitle',
      FlowDirection: 'flowDirection',
      PrintQuality: 'printQuality',
      TwinTurboRoll: 'twinTurboRoll',
      Rotation: 'rotation',
      IsTwinTurbo: 'isTwinTurbo',
      IsAutoCut: 'isAutoCut',
    };

    let xmlParameters = '<LabelWriterPrintParams>';

    const copies = parameters.copies ?? 1;
    xmlParameters += `<Copies>${copies}</Copies>`;

    Object.entries(parameterMappings).forEach(([xmlTag, paramKey]) => {
      const value = parameters[paramKey];
      if (value !== undefined) {
        const formattedValue = typeof value === 'boolean' ? (value ? 'True' : 'False') : value;
        xmlParameters += `<${xmlTag}>${formattedValue}</${xmlTag}>`;
      }
    });

    xmlParameters += '</LabelWriterPrintParams>';
    return xmlParameters;
  }
}

export default Dymo;
