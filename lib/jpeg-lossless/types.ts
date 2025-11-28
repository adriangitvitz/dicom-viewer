/**
 * Shared type definitions for the JPEG Lossless decoder
 */

/** Component specification for JPEG frame */
export interface ComponentSpec {
  hSamp: number;
  quantTableSel: number;
  vSamp: number;
}

/** Scan component specification */
export interface ScanComponentSpec {
  acTabSel: number;
  dcTabSel: number;
  scanCompSel: number;
}

/** Output data type - either 8-bit or 16-bit pixel data */
export type OutputData = Uint8Array | Uint16Array;

/** Getter function for reading pixel values */
export type GetterFunction = (index: number, compOffset?: number) => number;

/** Setter function for writing pixel values */
export type SetterFunction = (index: number, val: number, compOffset?: number) => void;

/** Output function for writing prediction values */
export type OutputFunction = (PRED: number[]) => void;

/** Selector function for lossless prediction */
export type SelectorFunction = (compOffset?: number) => number;

/** 4D Huffman table type [4][2][50*256] */
export type HuffTab4D = number[][][];

/** Data unit array type [10][4][64] */
export type DUArray = number[][][];
