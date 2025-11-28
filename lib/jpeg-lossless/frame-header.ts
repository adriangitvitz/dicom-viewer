import type { ComponentSpec } from './types';
import { createComponentSpec } from './component-spec';
import type { DataStream } from './data-stream';

/**
 * FrameHeader class for parsing JPEG frame headers (SOF - Start of Frame)
 */
export class FrameHeader {
  dimX: number = 0;
  dimY: number = 0;
  numComp: number = 0;
  precision: number = 0;
  components: ComponentSpec[] = [];

  /**
   * Parse frame header from DataStream
   * @param data - DataStream to read from
   * @returns 1 on success
   * @throws Error if frame format is invalid
   */
  read(data: DataStream): number {
    let count = 0;
    let temp: number;

    const length = data.get16();
    count += 2;

    this.precision = data.get8();
    count += 1;

    this.dimY = data.get16();
    count += 2;

    this.dimX = data.get16();
    count += 2;

    this.numComp = data.get8();
    count += 1;

    for (let i = 1; i <= this.numComp; i += 1) {
      if (count > length) {
        throw new Error('ERROR: frame format error');
      }

      const c = data.get8();
      count += 1;

      if (count >= length) {
        throw new Error('ERROR: frame format error [c>=Lf]');
      }

      temp = data.get8();
      count += 1;

      if (!this.components[c]) {
        this.components[c] = createComponentSpec();
      }

      this.components[c].hSamp = temp >> 4;
      this.components[c].vSamp = temp & 0x0f;
      this.components[c].quantTableSel = data.get8();
      count += 1;
    }

    if (count !== length) {
      throw new Error('ERROR: frame format error [Lf!=count]');
    }

    return 1;
  }
}
