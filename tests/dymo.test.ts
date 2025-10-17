import { expect, beforeEach, describe, it, vi } from 'vitest';
import Dymo from '../src/index.js';

vi.mock('tls', () => ({
  connect: vi.fn(),
}));

const createMockDymo = (options = {}) => {
  return new Dymo(options);
};

describe('Dymo', () => {
  let dymo: Dymo;

  beforeEach(() => {
    dymo = new Dymo();
    dymo['fetch'] = vi.fn();
  });

  describe('constructor', () => {
    it('should use default hostname and port if not provided', () => {
      const dymo = createMockDymo();
      expect(dymo).toHaveProperty('url', 'https://127.0.0.1:41951/DYMO/DLS/Printing');
    });

    it('should use custom hostname and port if provided', () => {
      const dymo = createMockDymo({ hostname: '192.168.1.100', port: 12345 });
      expect(dymo).toHaveProperty('url', 'https://192.168.1.100:12345/DYMO/DLS/Printing');
    });
  });

  describe('createPrintParamsXml', () => {
    it('should include Copies with default value of 1', () => {
      const dymo = createMockDymo();
      const xml = dymo['createPrintParamsXml']({});
      expect(xml).toContain('<Copies>1</Copies>');
    });

    it('should include provided Copies value', () => {
      const dymo = createMockDymo();
      const xml = dymo['createPrintParamsXml']({ copies: 3 });
      expect(xml).toContain('<Copies>3</Copies>');
    });

    it('should include provided JobTitle', () => {
      const dymo = createMockDymo();
      const xml = dymo['createPrintParamsXml']({ jobTitle: 'Test Job' });
      expect(xml).toContain('<JobTitle>Test Job</JobTitle>');
    });

    it('should format boolean values as "True" or "False"', () => {
      const dymo = createMockDymo();
      const xml = dymo['createPrintParamsXml']({
        isTwinTurbo: true,
        isAutoCut: false,
      });
      expect(xml).toContain('<IsTwinTurbo>True</IsTwinTurbo>');
      expect(xml).toContain('<IsAutoCut>False</IsAutoCut>');
    });

    it('should not include undefined parameters', () => {
      const dymo = createMockDymo();
      const xml = dymo['createPrintParamsXml']({});
      expect(xml).not.toContain('JobTitle');
      expect(xml).not.toContain('FlowDirection');
    });
  });

  describe('getPrinters', () => {
    it('should fetch and parse printers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(`
          <Printers>
            <LabelWriterPrinter>
              <Name>LabelWriter</Name>
              <ModelName>DYMO LabelWriter 550</ModelName>
              <IsConnected>True</IsConnected>
              <IsLocal>True</IsLocal>
              <IsTwinTurbo>False</IsTwinTurbo>
            </LabelWriterPrinter>
          </Printers>
        `),
      };
      dymo['fetch'] = vi.fn().mockResolvedValue(mockResponse);

      const result = await dymo.getPrinters();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        {
          name: 'LabelWriter',
          model: 'DYMO LabelWriter 550',
          connected: true,
          local: true,
          twinTurbo: false,
        },
      ]);
      expect(dymo['fetch']).toHaveBeenCalledWith(
        'https://127.0.0.1:41951/DYMO/DLS/Printing/GetPrinters'
      );
    });

    it('should handle fetch errors', async () => {
      dymo['fetch'] = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await dymo.getPrinters();

      expect(result.success).toBe(false);
      expect(result.data).toBeInstanceOf(Error);
    });
  });

  describe('renderLabel', () => {
    it('should render a label', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('"base64ImageData"'),
      };
      dymo['fetch'] = vi.fn().mockResolvedValue(mockResponse);

      const result = await dymo.renderLabel('<DYMOLabel>Test</DYMOLabel>');

      expect(result.success).toBe(true);
      expect(result.data).toBe('data:image/png;base64,base64ImageData');
      expect(dymo['fetch']).toHaveBeenCalledWith(
        'https://127.0.0.1:41951/DYMO/DLS/Printing/RenderLabel',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expect.stringContaining('labelXml=%3CDYMOLabel%3ETest%3C%2FDYMOLabel%3E'),
        })
      );
    });
  });

  describe('printLabel', () => {
    it('should print a label', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('true'),
      };
      dymo['fetch'] = vi.fn().mockResolvedValue(mockResponse);

      const result = await dymo.printLabel('DYMO LabelWriter 550', '<DYMOLabel>Test</DYMOLabel>', {
        copies: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(dymo['fetch']).toHaveBeenCalledWith(
        'https://127.0.0.1:41951/DYMO/DLS/Printing/PrintLabel',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expect.stringContaining(
            'printerName=DYMO+LabelWriter+550&labelXml=%3CDYMOLabel%3ETest%3C%2FDYMOLabel%3E&printParamsXml=%3CLabelWriterPrintParams%3E%3CCopies%3E2%3C%2FCopies%3E%3C%2FLabelWriterPrintParams%3E'
          ),
        })
      );
    });
  });

  describe('getConsumableInfo', () => {
    it('should return consumable info when SKU data is present', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              sku: 'S0722540',
              labelsRemaining: 999,
            })
          ),
      };
      dymo['fetch'] = vi.fn().mockResolvedValue(mockResponse);

      const result = await dymo.getConsumableInfo('DYMO LabelWriter 550');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        sku: 'S0722540',
        labelsRemaining: 999,
      });
      expect(dymo['fetch']).toHaveBeenCalledWith(
        'https://127.0.0.1:41951/DYMO/DLS/Printing/GetConsumableInfoIn550Printer?printerName=DYMO%20LabelWriter%20550'
      );
    });
  });
});
