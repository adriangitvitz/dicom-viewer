/**
 * Creates a multi-dimensional array with the specified dimensions
 * @param dimensions - Variable number of dimension sizes
 * @returns Multi-dimensional array
 */
export function createArray<T = unknown>(...dimensions: number[]): T[] {
  if (dimensions.length > 1) {
    const dim = dimensions[0];
    const rest = dimensions.slice(1);
    const newArray: T[] = [];
    for (let i = 0; i < dim; i++) {
      newArray[i] = createArray(...rest) as T;
    }
    return newArray;
  } else {
    return Array(dimensions[0]).fill(undefined) as T[];
  }
}

/**
 * Generate CRC lookup table
 */
export function makeCRCTable(): number[] {
  let c: number;
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  return crcTable;
}

/** Pre-computed CRC table */
export const crcTable = makeCRCTable();

/**
 * Calculate CRC32 checksum of a buffer
 * @param buffer - ArrayBuffer to calculate CRC for
 * @returns CRC32 checksum
 */
export function crc32(buffer: ArrayBuffer): number {
  const uint8view = new Uint8Array(buffer);
  let crc = 0 ^ -1;
  for (let i = 0; i < uint8view.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ uint8view[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}
