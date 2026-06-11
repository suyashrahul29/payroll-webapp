/**
 * Biometric Adapter Registry
 *
 * Central registry for all biometric device adapters.
 * To add a new device (Biomax, Matrix COSEC, etc.): create a new adapter file,
 * import it here, and register it — zero changes to core domain logic.
 */

import type { SourceAdapter } from "../types";
import { esslAdapter } from "./essl-adapter";
import { zktecoAdapter } from "./zkteco-adapter";

const registry: Map<string, SourceAdapter> = new Map([
  [esslAdapter.sourceId, esslAdapter],
  [zktecoAdapter.sourceId, zktecoAdapter],
]);

export function getAdapter(sourceId: string): SourceAdapter | undefined {
  return registry.get(sourceId);
}

export function registerAdapter(adapter: SourceAdapter): void {
  registry.set(adapter.sourceId, adapter);
}

export const biometricAdapters = {
  eSSL: esslAdapter,
  ZKTeco: zktecoAdapter,
} as const;

export { esslAdapter, zktecoAdapter };
