import { describe, it, expect, beforeEach } from 'vitest';
import { DataStream } from '../data-stream';
import { FrameHeader } from '../frame-header';
import { ScanHeader } from '../scan-header';
import { HuffmanTable } from '../huffman-table';
import { QuantizationTable } from '../quantization-table';
import { Decoder } from '../decoder';
import { createArray, crc32, makeCRCTable } from '../utils';
import { createComponentSpec } from '../component-spec';
import { createScanComponent } from '../scan-component';

describe('DataStream', () => {
  let buffer: ArrayBuffer;
  let stream: DataStream;

  beforeEach(() => {
    // Create a buffer with known values
    buffer = new ArrayBuffer(10);
    const view = new Uint8Array(buffer);
    view[0] = 0x12;
    view[1] = 0x34;
    view[2] = 0x56;
    view[3] = 0x78;
    view[4] = 0x9a;
    stream = new DataStream(buffer);
  });

  it('should read 8-bit values correctly', () => {
    expect(stream.get8()).toBe(0x12);
    expect(stream.get8()).toBe(0x34);
    expect(stream.get8()).toBe(0x56);
  });

  it('should read 16-bit big-endian values correctly', () => {
    expect(stream.get16()).toBe(0x1234);
    expect(stream.get16()).toBe(0x5678);
  });

  it('should advance index correctly', () => {
    expect(stream.index).toBe(0);
    stream.get8();
    expect(stream.index).toBe(1);
    stream.get16();
    expect(stream.index).toBe(3);
  });

  it('should handle offset and length parameters', () => {
    const streamWithOffset = new DataStream(buffer, 2, 3);
    expect(streamWithOffset.get8()).toBe(0x56);
    expect(streamWithOffset.get8()).toBe(0x78);
    expect(streamWithOffset.get8()).toBe(0x9a);
  });
});

describe('FrameHeader', () => {
  it('should initialize with default values', () => {
    const header = new FrameHeader();
    expect(header.dimX).toBe(0);
    expect(header.dimY).toBe(0);
    expect(header.numComp).toBe(0);
    expect(header.precision).toBe(0);
    expect(header.components).toEqual([]);
  });

  it('should parse a valid frame header', () => {
    // Create a minimal valid frame header
    // Length: 11 bytes (for 1 component)
    // Precision: 8 bits
    // Height: 100
    // Width: 200
    // NumComp: 1
    // Component 1: ID=1, H=1, V=1, Tq=0
    const buffer = new ArrayBuffer(11);
    const view = new Uint8Array(buffer);
    view[0] = 0x00;
    view[1] = 0x0b; // Length = 11
    view[2] = 0x08; // Precision = 8
    view[3] = 0x00;
    view[4] = 0x64; // Height = 100
    view[5] = 0x00;
    view[6] = 0xc8; // Width = 200
    view[7] = 0x01; // NumComp = 1
    view[8] = 0x01; // Component ID = 1
    view[9] = 0x11; // H=1, V=1
    view[10] = 0x00; // Tq = 0

    const stream = new DataStream(buffer);
    const header = new FrameHeader();
    header.read(stream);

    expect(header.precision).toBe(8);
    expect(header.dimY).toBe(100);
    expect(header.dimX).toBe(200);
    expect(header.numComp).toBe(1);
    expect(header.components[1]).toBeDefined();
    expect(header.components[1].hSamp).toBe(1);
    expect(header.components[1].vSamp).toBe(1);
    expect(header.components[1].quantTableSel).toBe(0);
  });
});

describe('ScanHeader', () => {
  it('should initialize with default values', () => {
    const header = new ScanHeader();
    expect(header.ah).toBe(0);
    expect(header.al).toBe(0);
    expect(header.numComp).toBe(0);
    expect(header.selection).toBe(0);
    expect(header.spectralEnd).toBe(0);
    expect(header.components).toEqual([]);
  });

  it('should parse a valid scan header', () => {
    // Create a minimal valid scan header for 1 component
    // Length: 8 bytes
    // NumComp: 1
    // Component: Cs=1, Td=0, Ta=0
    // Ss=1 (predictor selection)
    // Se=0
    // Ah=0, Al=0
    const buffer = new ArrayBuffer(8);
    const view = new Uint8Array(buffer);
    view[0] = 0x00;
    view[1] = 0x08; // Length = 8
    view[2] = 0x01; // NumComp = 1
    view[3] = 0x01; // Cs = 1
    view[4] = 0x00; // Td=0, Ta=0
    view[5] = 0x01; // Ss = 1 (predictor)
    view[6] = 0x00; // Se = 0
    view[7] = 0x00; // Ah=0, Al=0

    const stream = new DataStream(buffer);
    const header = new ScanHeader();
    header.read(stream);

    expect(header.numComp).toBe(1);
    expect(header.selection).toBe(1);
    expect(header.spectralEnd).toBe(0);
    expect(header.ah).toBe(0);
    expect(header.al).toBe(0);
    expect(header.components[0].scanCompSel).toBe(1);
    expect(header.components[0].dcTabSel).toBe(0);
    expect(header.components[0].acTabSel).toBe(0);
  });
});

describe('HuffmanTable', () => {
  it('should initialize with correct array dimensions', () => {
    const table = new HuffmanTable();
    expect(table.l.length).toBe(4);
    expect(table.l[0].length).toBe(2);
    expect(table.l[0][0].length).toBe(16);
    expect(table.th).toEqual([0, 0, 0, 0]);
    expect(table.v.length).toBe(4);
  });

  it('should have correct MSB constant', () => {
    expect(HuffmanTable.MSB).toBe(0x80000000);
  });
});

describe('QuantizationTable', () => {
  it('should initialize with correct array dimensions', () => {
    const table = new QuantizationTable();
    expect(table.tq).toEqual([0, 0, 0, 0]);
    expect(table.quantTables.length).toBe(4);
    expect(table.quantTables[0].length).toBe(64);
  });
});

describe('Decoder', () => {
  it('should initialize with default values', () => {
    const decoder = new Decoder();
    expect(decoder.buffer).toBeNull();
    expect(decoder.numBytes).toBe(0);
    expect(decoder.xDim).toBe(0);
    expect(decoder.yDim).toBe(0);
  });

  it('should initialize with provided buffer and numBytes', () => {
    const buffer = new ArrayBuffer(100);
    const decoder = new Decoder(buffer, 2);
    expect(decoder.buffer).toBe(buffer);
    expect(decoder.numBytes).toBe(2);
  });

  it('should have correct static constants', () => {
    expect(Decoder.MSB).toBe(0x80000000);
    expect(Decoder.RESTART_MARKER_BEGIN).toBe(0xffd0);
    expect(Decoder.RESTART_MARKER_END).toBe(0xffd7);
    expect(Decoder.MAX_HUFFMAN_SUBTREE).toBe(50);
    expect(Decoder.IDCT_P.length).toBe(64);
    expect(Decoder.TABLE.length).toBe(64);
  });

  it('should throw error for non-JPEG data', () => {
    const buffer = new ArrayBuffer(10);
    const view = new Uint8Array(buffer);
    view[0] = 0x00;
    view[1] = 0x00; // Not a JPEG SOI marker

    const decoder = new Decoder();
    expect(() => decoder.decode(buffer, 0, 10)).toThrow('Not a JPEG file');
  });
});

describe('utils', () => {
  describe('createArray', () => {
    it('should create 1D array', () => {
      const arr = createArray(5);
      expect(arr.length).toBe(5);
      expect(arr.every((v) => v === undefined)).toBe(true);
    });

    it('should create 2D array', () => {
      const arr = createArray<number[]>(3, 4);
      expect(arr.length).toBe(3);
      expect(arr[0].length).toBe(4);
      expect(arr[1].length).toBe(4);
      expect(arr[2].length).toBe(4);
    });

    it('should create 3D array', () => {
      const arr = createArray<number[][]>(2, 3, 4);
      expect(arr.length).toBe(2);
      expect(arr[0].length).toBe(3);
      expect(arr[0][0].length).toBe(4);
    });
  });

  describe('crc32', () => {
    it('should compute CRC32 for empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      const result = crc32(buffer);
      expect(result).toBe(0);
    });

    it('should compute CRC32 for known data', () => {
      // "123456789" ASCII bytes
      const buffer = new ArrayBuffer(9);
      const view = new Uint8Array(buffer);
      '123456789'.split('').forEach((c, i) => {
        view[i] = c.charCodeAt(0);
      });

      const result = crc32(buffer);
      // Known CRC32 for "123456789" is 0xCBF43926
      expect(result).toBe(0xcbf43926);
    });
  });

  describe('makeCRCTable', () => {
    it('should create a table with 256 entries', () => {
      const table = makeCRCTable();
      expect(table.length).toBe(256);
    });

    it('should have consistent values', () => {
      const table1 = makeCRCTable();
      const table2 = makeCRCTable();
      expect(table1).toEqual(table2);
    });
  });
});

describe('Factory functions', () => {
  describe('createComponentSpec', () => {
    it('should create a component spec with default values', () => {
      const spec = createComponentSpec();
      expect(spec.hSamp).toBe(0);
      expect(spec.vSamp).toBe(0);
      expect(spec.quantTableSel).toBe(0);
    });
  });

  describe('createScanComponent', () => {
    it('should create a scan component with default values', () => {
      const comp = createScanComponent();
      expect(comp.acTabSel).toBe(0);
      expect(comp.dcTabSel).toBe(0);
      expect(comp.scanCompSel).toBe(0);
    });
  });
});

describe('Integration', () => {
  it('should export all expected modules from index', async () => {
    const module = await import('../index');

    // Classes
    expect(module.Decoder).toBeDefined();
    expect(module.DataStream).toBeDefined();
    expect(module.FrameHeader).toBeDefined();
    expect(module.HuffmanTable).toBeDefined();
    expect(module.QuantizationTable).toBeDefined();
    expect(module.ScanHeader).toBeDefined();

    // Factory functions
    expect(module.createComponentSpec).toBeDefined();
    expect(module.createScanComponent).toBeDefined();

    // Utils
    expect(module.createArray).toBeDefined();
    expect(module.crc32).toBeDefined();
    expect(module.crcTable).toBeDefined();
    expect(module.makeCRCTable).toBeDefined();
    expect(module.Utils).toBeDefined();
  });
});
