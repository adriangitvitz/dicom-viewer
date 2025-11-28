export type Tool = "select" | "pan" | "windowLevel" | "length" | "angle" | "rectangle" | "ellipse" | "freehand"

export interface DicomMetadata {
  patientName?: string
  patientId?: string
  patientBirthDate?: string
  patientSex?: string
  patientAge?: string
  studyDate?: string
  studyTime?: string
  studyDescription?: string
  studyInstanceUid?: string
  accessionNumber?: string
  institutionName?: string
  seriesDate?: string
  seriesTime?: string
  seriesDescription?: string
  seriesInstanceUid?: string
  seriesNumber?: number
  modality?: string
  rows?: number
  columns?: number
  pixelSpacing?: [number, number]
  sliceThickness?: number
  sliceLocation?: number
  imagePosition?: [number, number, number]
  imageOrientation?: number[]
  instanceNumber?: number
  bitsAllocated?: number
  bitsStored?: number
  highBit?: number
  pixelRepresentation?: number
  windowCenter?: number
  windowWidth?: number
  rescaleIntercept?: number
  rescaleSlope?: number
  transferSyntaxUid?: string
  photometricInterpretation?: string
}

export interface Point {
  x: number
  y: number
}

export interface Annotation {
  id: string
  type: Tool
  frameIndex: number
  data: {
    start?: Point
    end?: Point
    mid?: Point
    points?: Point[]
  }
  createdAt: Date
  label?: string
}

export interface DicomImage {
  metadata: DicomMetadata
  pixelData: Int16Array | Uint16Array | Uint8Array
  width: number
  height: number
}
