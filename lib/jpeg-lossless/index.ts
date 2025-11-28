/**
 * JPEG Lossless Decoder
 * TypeScript implementation for decoding JPEG lossless compressed images
 */

// Main decoder class
export { Decoder } from './decoder';

// Supporting classes
export { DataStream } from './data-stream';
export { FrameHeader } from './frame-header';
export { HuffmanTable } from './huffman-table';
export { QuantizationTable } from './quantization-table';
export { ScanHeader } from './scan-header';

// Factory functions
export { createComponentSpec } from './component-spec';
export { createScanComponent } from './scan-component';

// Utility functions
export { createArray, crc32, crcTable, makeCRCTable } from './utils';

// Types
export type {
  ComponentSpec,
  ScanComponentSpec,
  OutputData,
  GetterFunction,
  SetterFunction,
  OutputFunction,
  SelectorFunction,
  HuffTab4D,
  DUArray,
} from './types';

// Re-export Utils as a namespace for backwards compatibility
import * as Utils from './utils';
export { Utils };
