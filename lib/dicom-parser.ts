import type { DicomMetadata } from "./dicom-types"
import { Decoder } from '@/lib/jpeg-lossless';

function extractEncapsulatedFrame(
  arrayBuffer: ArrayBuffer,
  pixelDataOffset: number
): Uint8Array {
  const dataView = new DataView(arrayBuffer)
  const uint8Array = new Uint8Array(arrayBuffer)
  let offset = pixelDataOffset

  const itemTag1 = dataView.getUint16(offset, true)
  const itemTag2 = dataView.getUint16(offset + 2, true)
  if (itemTag1 === 0xfffe && itemTag2 === 0xe000) {
    const botLength = dataView.getUint32(offset + 4, true)
    offset += 8 + botLength
  }

  const fragTag1 = dataView.getUint16(offset, true)
  const fragTag2 = dataView.getUint16(offset + 2, true)
  if (fragTag1 === 0xfffe && fragTag2 === 0xe000) {
    const fragLength = dataView.getUint32(offset + 4, true)
    offset += 8
    return uint8Array.slice(offset, offset + fragLength)
  }

  return new Uint8Array(0)
}

const TAGS = {
  PATIENT_NAME: "00100010",
  PATIENT_ID: "00100020",
  PATIENT_BIRTH_DATE: "00100030",
  PATIENT_SEX: "00100040",
  STUDY_DATE: "00080020",
  STUDY_DESCRIPTION: "00081030",
  INSTITUTION_NAME: "00080080",
  SERIES_NUMBER: "00200011",
  MODALITY: "00080060",
  ROWS: "00280010",
  COLUMNS: "00280011",
  BITS_ALLOCATED: "00280100",
  BITS_STORED: "00280101",
  HIGH_BIT: "00280102",
  PIXEL_REPRESENTATION: "00280103",
  WINDOW_CENTER: "00281050",
  WINDOW_WIDTH: "00281051",
  RESCALE_INTERCEPT: "00281052",
  RESCALE_SLOPE: "00281053",
  PIXEL_SPACING: "00280030",
  SLICE_THICKNESS: "00180050",
  PIXEL_DATA: "7FE00010",
  PHOTOMETRIC_INTERPRETATION: "00280004",
  TRANSFER_SYNTAX_UID: "00020010",
  SAMPLES_PER_PIXEL: "00280002",
}

export async function parseDicomFile(file: File): Promise<{
  metadata: DicomMetadata
  imageData: ImageData
  pixelSpacing: [number, number] | null
}> {
  const arrayBuffer = await file.arrayBuffer()
  const dataView = new DataView(arrayBuffer)
  const uint8Array = new Uint8Array(arrayBuffer)

  // Check for DICOM preamble (128 bytes) + "DICM" magic number
  let offset = 0
  const hasPreamble =
    uint8Array[128] === 0x44 && // 'D'
    uint8Array[129] === 0x49 && // 'I'
    uint8Array[130] === 0x43 && // 'C'
    uint8Array[131] === 0x4d // 'M'

  if (hasPreamble) {
    offset = 132
  }

  const metadata: DicomMetadata = {}
  let pixelData: Int16Array | Uint16Array | Uint8Array | null = null
  const isLittleEndian = true
  const isExplicitVR = true
  let transferSyntax = "";

  while (offset < arrayBuffer.byteLength - 8) {
    const group = dataView.getUint16(offset, isLittleEndian)
    const element = dataView.getUint16(offset + 2, isLittleEndian)
    const tag = group.toString(16).padStart(4, "0") + element.toString(16).padStart(4, "0")
    offset += 4

    let vr = ""
    let length = 0

    if (isExplicitVR && group !== 0xfffe) {
      vr = String.fromCharCode(uint8Array[offset], uint8Array[offset + 1])
      offset += 2

      if (["OB", "OD", "OF", "OL", "OW", "SQ", "UC", "UN", "UR", "UT"].includes(vr)) {
        offset += 2
        length = dataView.getUint32(offset, isLittleEndian)
        offset += 4
      } else {
        length = dataView.getUint16(offset, isLittleEndian)
        offset += 2
      }
    } else {
      length = dataView.getUint32(offset, isLittleEndian)
      offset += 4
    }

    if (length === 0xffffffff) {
      if (tag.toUpperCase() === "7FE00010") {
        length = 0
      } else {
        while (offset < arrayBuffer.byteLength - 8) {
          const seqGroup = dataView.getUint16(offset, isLittleEndian)
          const seqElement = dataView.getUint16(offset + 2, isLittleEndian)
          if (seqGroup === 0xfffe && (seqElement === 0xe00d || seqElement === 0xe0dd)) {
            offset += 8
            break
          }
          offset++
        }
        continue
      }
    }

    if (offset + length > arrayBuffer.byteLength) {
      break
    }

    const value = uint8Array.slice(offset, offset + length)

    switch (tag.toUpperCase()) {
      case TAGS.TRANSFER_SYNTAX_UID:
        transferSyntax = decodeString(value)
        break
      case TAGS.PATIENT_NAME:
        metadata.patientName = decodeString(value)
        break
      case TAGS.PATIENT_ID:
        metadata.patientId = decodeString(value)
        break
      case TAGS.PATIENT_BIRTH_DATE:
        metadata.patientBirthDate = decodeString(value)
        break
      case TAGS.PATIENT_SEX:
        metadata.patientSex = decodeString(value)
        break
      case TAGS.STUDY_DATE:
        metadata.studyDate = decodeString(value)
        break
      case TAGS.STUDY_DESCRIPTION:
        metadata.studyDescription = decodeString(value)
        break
      case TAGS.INSTITUTION_NAME:
        metadata.institutionName = decodeString(value)
        break
      case TAGS.SERIES_NUMBER:
        metadata.seriesNumber = Number.parseInt(decodeString(value)) || undefined
        break
      case TAGS.MODALITY:
        metadata.modality = decodeString(value)
        break
      case TAGS.ROWS:
        metadata.rows = dataView.getUint16(offset, isLittleEndian)
        break
      case TAGS.COLUMNS:
        metadata.columns = dataView.getUint16(offset, isLittleEndian)
        break
      case TAGS.BITS_ALLOCATED:
        metadata.bitsAllocated = dataView.getUint16(offset, isLittleEndian)
        break
      case TAGS.BITS_STORED:
        metadata.bitsStored = dataView.getUint16(offset, isLittleEndian)
        break
      case TAGS.HIGH_BIT:
        metadata.highBit = dataView.getUint16(offset, isLittleEndian)
        break
      case TAGS.PIXEL_REPRESENTATION:
        metadata.pixelRepresentation = dataView.getUint16(offset, isLittleEndian)
        break
      case TAGS.WINDOW_CENTER:
        metadata.windowCenter = Number.parseFloat(decodeString(value)) || 40
        break
      case TAGS.WINDOW_WIDTH:
        metadata.windowWidth = Number.parseFloat(decodeString(value)) || 400
        break
      case TAGS.RESCALE_INTERCEPT:
        metadata.rescaleIntercept = Number.parseFloat(decodeString(value)) || 0
        break
      case TAGS.RESCALE_SLOPE:
        metadata.rescaleSlope = Number.parseFloat(decodeString(value)) || 1
        break
      case TAGS.PIXEL_SPACING: {
        const spacingStr = decodeString(value)
        const parts = spacingStr.split("\\")
        if (parts.length >= 2) {
          metadata.pixelSpacing = [Number.parseFloat(parts[0]), Number.parseFloat(parts[1])]
        }
        break
      }
      case TAGS.SLICE_THICKNESS:
        metadata.sliceThickness = Number.parseFloat(decodeString(value))
        break
      case TAGS.PHOTOMETRIC_INTERPRETATION:
        metadata.photometricInterpretation = decodeString(value)
        break
      case TAGS.PIXEL_DATA.toUpperCase():
      case "7FE00010": {
        const bitsAllocated = metadata.bitsAllocated || 16
        const pixelRepresentation = metadata.pixelRepresentation || 0
        const isJpegLossless = transferSyntax === "1.2.840.10008.1.2.4.70"

        if (isJpegLossless) {
          const jpegData = extractEncapsulatedFrame(arrayBuffer, offset)
          if (jpegData.length > 0) {
            const decoder = new Decoder()
            const jpegBuffer = jpegData.buffer.slice(
              jpegData.byteOffset,
              jpegData.byteOffset + jpegData.byteLength
            )
            pixelData = decoder.decode(jpegBuffer, 0, jpegBuffer.byteLength)
          }
          offset = arrayBuffer.byteLength
        } else {
          if (bitsAllocated === 8) {
            pixelData = new Uint8Array(arrayBuffer, offset, length)
          } else if (bitsAllocated === 16) {
            if (pixelRepresentation === 1) {
              // Signed
              pixelData = new Int16Array(arrayBuffer.slice(offset, offset + length))
            } else {
              // Unsigned
              pixelData = new Uint16Array(arrayBuffer.slice(offset, offset + length))
            }
          }
          offset += length
        }
        break
      }
    }

    if (tag.toUpperCase() !== "7FE00010") {
      offset += length
    }
  }

  metadata.rows = metadata.rows || 512
  metadata.columns = metadata.columns || 512
  metadata.windowCenter = metadata.windowCenter || 40
  metadata.windowWidth = metadata.windowWidth || 400
  metadata.rescaleSlope = metadata.rescaleSlope || 1
  metadata.rescaleIntercept = metadata.rescaleIntercept || 0

  const width = metadata.columns
  const height = metadata.rows
  const imageData = new ImageData(width, height)

  if (pixelData) {
    const slope = metadata.rescaleSlope
    const intercept = metadata.rescaleIntercept

    for (let i = 0; i < pixelData.length && i < width * height; i++) {
      const hu = pixelData[i] * slope + intercept
      const normalized = Math.max(0, Math.min(65535, hu + 32768))
      const byte = Math.round((normalized / 65535) * 255)

      const idx = i * 4
      imageData.data[idx] = byte
      imageData.data[idx + 1] = byte
      imageData.data[idx + 2] = byte
      imageData.data[idx + 3] = 255
    }
  } else {
    for (let i = 0; i < width * height * 4; i += 4) {
      const noise = Math.random() * 50
      imageData.data[i] = noise
      imageData.data[i + 1] = noise
      imageData.data[i + 2] = noise
      imageData.data[i + 3] = 255
    }
  }

  return {
    metadata,
    imageData,
    pixelSpacing: metadata.pixelSpacing || null,
  }
}

function decodeString(bytes: Uint8Array): string {
  try {
    const decoder = new TextDecoder("utf-8")
    return decoder.decode(bytes).trim().replace(/\0/g, "")
  } catch {
    return Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join("")
      .trim()
      .replace(/\0/g, "")
  }
}

export function applyWindowLevel(imageData: ImageData, windowWidth: number, windowCenter: number): ImageData {
  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)

  const minValue = windowCenter - windowWidth / 2
  const maxValue = windowCenter + windowWidth / 2

  for (let i = 0; i < result.data.length; i += 4) {
    const originalValue = result.data[i]
    const hu = (originalValue / 255) * 65535 - 32768
    let displayValue: number
    if (hu <= minValue) {
      displayValue = 0
    } else if (hu >= maxValue) {
      displayValue = 255
    } else {
      displayValue = Math.round(((hu - minValue) / windowWidth) * 255)
    }

    result.data[i] = displayValue
    result.data[i + 1] = displayValue
    result.data[i + 2] = displayValue
  }

  return result
}

export function renderDicomToCanvas(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  zoom: number,
  panOffset: { x: number; y: number },
  dimensions: { width: number; height: number },
  canvasSize: { width: number; height: number },
): void {
  const canvas = ctx.canvas

  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = imageData.width
  tempCanvas.height = imageData.height
  const tempCtx = tempCanvas.getContext("2d")
  if (!tempCtx) return

  tempCtx.putImageData(imageData, 0, 0)

  const baseScale = Math.min(canvasSize.width / dimensions.width, canvasSize.height / dimensions.height) * 0.9

  const effectiveScale = baseScale * zoom

  const scaledWidth = dimensions.width * effectiveScale
  const scaledHeight = dimensions.height * effectiveScale

  const x = (canvasSize.width - scaledWidth) / 2 + panOffset.x
  const y = (canvasSize.height - scaledHeight) / 2 + panOffset.y

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight)
}
