import type {
  DymoOptions,
  Printer,
  DymoResponse,
  UniversalResponse,
  LabelParameters,
  ConsumableInfo,
} from './types.ts';

export abstract class BaseDymo {
  protected url: string;

  constructor(options: DymoOptions = {}) {
    const { hostname = '127.0.0.1', port = 41951 } = options;
    this.url = `https://${hostname}:${port}/DYMO/DLS/Printing`;
  }

  protected abstract fetch(input: RequestInfo, init?: RequestInit): Promise<UniversalResponse>;

  protected getIp(): string {
    const url = new URL(this.url);
    return url.hostname;
  }

  protected getPort(): number {
    const url = new URL(this.url);
    return parseInt(url.port) || 443;
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

  protected createPrintParamsXml(parameters: LabelParameters): string {
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

