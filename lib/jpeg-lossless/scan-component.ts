import type { ScanComponentSpec } from './types';

/**
 * Creates a new ScanComponentSpec with default values
 */
export function createScanComponent(): ScanComponentSpec {
  return {
    acTabSel: 0,
    dcTabSel: 0,
    scanCompSel: 0,
  };
}

export type { ScanComponentSpec };
