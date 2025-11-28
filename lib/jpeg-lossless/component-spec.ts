import type { ComponentSpec } from './types';

/**
 * Creates a new ComponentSpec with default values
 */
export function createComponentSpec(): ComponentSpec {
  return {
    hSamp: 0,
    quantTableSel: 0,
    vSamp: 0,
  };
}

export type { ComponentSpec };
