import { XMLParser } from 'fast-xml-parser';

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

class Dymo {
  private static readonly url: string = 'https://127.0.0.1:41951/DYMO/DLS/Printing';

  static async getPrinters(): Promise<DymoResponse<Printer[]>> {
    try {
      if (typeof process !== 'undefined' && process.env) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }
      const response = await fetch(`${this.url}/GetPrinters`);
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

export default Dymo;
