import type { DataStream } from './data-stream';
import { createArray } from './utils';

/**
 * HuffmanTable class for managing Huffman coding tables for entropy decoding
 */
export class HuffmanTable {
  static readonly MSB = 0x80000000;

  /** Code length frequencies [4][2][16] */
  l: number[][][];

  /** Table indicators [4] */
  th: number[];

  /** Huffman values [4][2][16][200] */
  v: number[][][][];

  /** Table class indicators [4][2] */
  tc: number[][];

  constructor() {
    this.l = createArray<number[][]>(4, 2, 16);
    this.th = [0, 0, 0, 0];
    this.v = createArray<number[][][]>(4, 2, 16, 200);
    this.tc = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
  }

  /**
   * Parse Huffman table from DataStream
   * @param data - DataStream to read from
   * @param HuffTab - Huffman lookup table to build
   * @returns 1 on success
   * @throws Error if table format is invalid
   */
  read(data: DataStream, HuffTab: number[][][]): number {
    let count = 0;
    let temp: number;
    let t: number;
    let c: number;
    let i: number;
    let j: number;

    const length = data.get16();
    count += 2;

    while (count < length) {
      temp = data.get8();
      count += 1;

      t = temp & 0x0f;
      if (t > 3) {
        throw new Error('ERROR: Huffman table ID > 3');
      }

      c = temp >> 4;
      if (c > 2) {
        throw new Error('ERROR: Huffman table [Table class > 2 ]');
      }

      this.th[t] = 1;
      this.tc[t][c] = 1;

      for (i = 0; i < 16; i += 1) {
        this.l[t][c][i] = data.get8();
        count += 1;
      }

      for (i = 0; i < 16; i += 1) {
        for (j = 0; j < this.l[t][c][i]; j += 1) {
          if (count > length) {
            throw new Error('ERROR: Huffman table format error [count>Lh]');
          }

          this.v[t][c][i][j] = data.get8();
          count += 1;
        }
      }
    }

    if (count !== length) {
      throw new Error('ERROR: Huffman table format error [count!=Lf]');
    }

    for (i = 0; i < 4; i += 1) {
      for (j = 0; j < 2; j += 1) {
        if (this.tc[i][j] !== 0) {
          this.buildHuffTable(HuffTab[i][j], this.l[i][j], this.v[i][j]);
        }
      }
    }

    return 1;
  }

  /**
   * Build Huffman lookup table for fast decoding
   * @param tab - Output lookup table
   * @param L - Code length frequencies
   * @param V - Huffman values
   */
  buildHuffTable(tab: number[], L: number[], V: number[][]): void {
    let currentTable: number;
    let k: number;
    let i: number;
    let j: number;
    let n: number;
    const temp = 256;

    k = 0;

    for (i = 0; i < 8; i += 1) {
      for (j = 0; j < L[i]; j += 1) {
        for (n = 0; n < temp >> (i + 1); n += 1) {
          tab[k] = V[i][j] | ((i + 1) << 8);
          k += 1;
        }
      }
    }

    for (i = 1; k < 256; i += 1, k += 1) {
      tab[k] = i | HuffmanTable.MSB;
    }

    currentTable = 1;
    k = 0;

    for (i = 8; i < 16; i += 1) {
      for (j = 0; j < L[i]; j += 1) {
        for (n = 0; n < temp >> (i - 7); n += 1) {
          tab[currentTable * 256 + k] = V[i][j] | ((i + 1) << 8);
          k += 1;
        }

        if (k >= 256) {
          if (k > 256) {
            throw new Error('ERROR: Huffman table error(1)!');
          }

          k = 0;
          currentTable += 1;
        }
      }
    }
  }
}
