/**
 * DataStream class for reading binary data from ArrayBuffer
 * Handles big-endian byte reading for JPEG format
 */
export class DataStream {
  buffer: Uint8Array;
  index: number;

  constructor(data: ArrayBufferLike, offset?: number, length?: number) {
    this.buffer = new Uint8Array(data, offset, length);
    this.index = 0;
  }

  /**
   * Read a 16-bit big-endian value
   */
  get16(): number {
    const value = (this.buffer[this.index] << 8) + this.buffer[this.index + 1];
    this.index += 2;
    return value;
  }

  /**
   * Read an 8-bit value
   */
  get8(): number {
    const value = this.buffer[this.index];
    this.index += 1;
    return value;
  }
}
