export interface Printer {
  name: string;
  model: string;
  connected: boolean;
  local: boolean;
  twinTurbo: boolean;
}

export interface LabelWriterPrinterResponse {
  Name: string;
  ModelName: string;
  IsConnected: string;
  IsLocal: string;
  IsTwinTurbo: string;
}

export interface PrintersResponse {
  Printers: {
    LabelWriterPrinter: Array<LabelWriterPrinterResponse> | LabelWriterPrinterResponse;
  };
}

export interface DymoResponse<T> {
  success: boolean;
  data: T | Error;
}

export interface UniversalResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export interface DymoOptions {
  hostname?: string;
  port?: number;
}
