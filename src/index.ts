import https from 'https';
import type { DymoOptions, UniversalResponse } from './types.ts';
import { BaseDymo } from './core.js';

class Dymo extends BaseDymo {
  private cachedDymoCertificate: string = '';

  constructor(options: DymoOptions = {}) {
    super(options);
  }

  protected async fetch(input: RequestInfo, init?: RequestInit): Promise<UniversalResponse> {
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

  private async getDymoCertificate(): Promise<string> {
    if (this.cachedDymoCertificate) {
      return this.cachedDymoCertificate;
    }
    this.cachedDymoCertificate = await this.fetchDymoCertificate();
    return this.cachedDymoCertificate;
  }
}

export default Dymo;
