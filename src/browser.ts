import type { DymoOptions, UniversalResponse } from './types.ts';
import { BaseDymo } from './core.js';

class Dymo extends BaseDymo {
  constructor(options: DymoOptions = {}) {
    super(options);
  }

  protected async fetch(input: RequestInfo, init?: RequestInit): Promise<UniversalResponse> {
    const response = await globalThis.fetch(input, init);
    return {
      ok: response.ok,
      status: response.status,
      text: () => response.text(),
    };
  }
}

export default Dymo;

