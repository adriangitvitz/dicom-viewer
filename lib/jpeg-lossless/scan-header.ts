import type { ScanComponentSpec } from './types';
import { createScanComponent } from './scan-component';
import type { DataStream } from './data-stream';

/**
 * ScanHeader class for parsing JPEG scan segment (SOS - Start of Scan)
 */
export class ScanHeader {
  /** Approximation high bits */
  ah: number = 0;

  /** Approximation low bits */
  al: number = 0;

  /** Number of components in the scan */
  numComp: number = 0;

  /** Start of spectral or predictor selection */
  selection: number = 0;

  /** End of spectral selection */
  spectralEnd: number = 0;

  /** Scan components */
  components: ScanComponentSpec[] = [];

  /**
   * Parse scan header from DataStream
   * @param data - DataStream to read from
   * @returns 1 on success
   * @throws Error if scan header format is invalid
   */
  read(data: DataStream): number {
    let count = 0;
    let i: number;
    let temp: number;

    const length = data.get16();
    count += 2;

    this.numComp = data.get8();
    count += 1;

    for (i = 0; i < this.numComp; i += 1) {
      this.components[i] = createScanComponent();

      if (count > length) {
        throw new Error('ERROR: scan header format error');
      }

      this.components[i].scanCompSel = data.get8();
      count += 1;

      temp = data.get8();
      count += 1;

      this.components[i].dcTabSel = temp >> 4;
      this.components[i].acTabSel = temp & 0x0f;
    }

    this.selection = data.get8();
    count += 1;

    this.spectralEnd = data.get8();
    count += 1;

    temp = data.get8();
    this.ah = temp >> 4;
    this.al = temp & 0x0f;
    count += 1;

    if (count !== length) {
      throw new Error('ERROR: scan header format error [count!=Ns]');
    }

    return 1;
  }
}
