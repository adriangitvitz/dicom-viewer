"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"
import type { DicomMetadata, Tool, Annotation, Point } from "@/lib/dicom-types"
import { parseDicomFile, renderDicomToCanvas, applyWindowLevel } from "@/lib/dicom-parser"

interface ViewerCanvasProps {
  files: File[]
  currentIndex: number
  activeTool: Tool
  zoom: number
  windowWidth: number
  windowCenter: number
  onMetadataLoaded: (metadata: DicomMetadata) => void
  onAddAnnotation: (annotation: Annotation) => void
  annotations: Annotation[]
  showAnnotations: boolean
  onWindowWidthChange: (width: number) => void
  onWindowCenterChange: (center: number) => void
  onDeleteAnnotation: (id: string) => void
}

interface CachedDicomData {
  imageData: ImageData
  pixelSpacing: [number, number] | null
  metadata: DicomMetadata
}

export function ViewerCanvas({
  files,
  currentIndex,
  activeTool,
  zoom,
  windowWidth,
  windowCenter,
  onMetadataLoaded,
  onAddAnnotation,
  annotations,
  showAnnotations,
  onWindowWidthChange,
  onWindowCenterChange,
  onDeleteAnnotation,
}: ViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentImageData, setCurrentImageData] = useState<ImageData | null>(null)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [currentDraw, setCurrentDraw] = useState({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: 512, height: 512 })
  const [pixelSpacing, setPixelSpacing] = useState<[number, number] | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  const [anglePoints, setAnglePoints] = useState<Point[]>([])
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([])
  const [isAdjustingWindowLevel, setIsAdjustingWindowLevel] = useState(false)
  const [initialWindowLevel, setInitialWindowLevel] = useState({ width: 400, center: 40 })
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)

  const cacheRef = useRef<Map<string, CachedDicomData>>(new Map())

  useEffect(() => {
    if (!containerRef.current) return

    const updateCanvasSize = () => {
      if (!containerRef.current || !canvasRef.current || !overlayCanvasRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)

      if (width > 0 && height > 0) {
        canvasRef.current.width = width
        canvasRef.current.height = height
        overlayCanvasRef.current.width = width
        overlayCanvasRef.current.height = height
        setCanvasSize({ width, height })
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
    })

    resizeObserver.observe(containerRef.current)
    requestAnimationFrame(updateCanvasSize)

    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (files.length === 0) return

    const preloadFiles = async () => {
      cacheRef.current.clear()

      const parsePromises = files.map(async (file, index) => {
        const cacheKey = `${file.name}-${index}`
        try {
          const result = await parseDicomFile(file)
          cacheRef.current.set(cacheKey, {
            imageData: result.imageData,
            pixelSpacing: result.pixelSpacing,
            metadata: result.metadata,
          })
        } catch (err) {
          console.error(`Failed to parse file ${file.name}:`, err)
        }
      })

      await Promise.all(parsePromises)
    }

    preloadFiles()
  }, [files])

  useEffect(() => {
    if (!files[currentIndex]) return

    const loadCurrentImage = async () => {
      const file = files[currentIndex]
      const cacheKey = `${file.name}-${currentIndex}`

      const cached = cacheRef.current.get(cacheKey)

      if (cached) {
        setCurrentImageData(cached.imageData)
        setPixelSpacing(cached.pixelSpacing)
        setDimensions({ width: cached.imageData.width, height: cached.imageData.height })
        onMetadataLoaded(cached.metadata)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { metadata, imageData: data, pixelSpacing: spacing } = await parseDicomFile(file)

        cacheRef.current.set(cacheKey, {
          imageData: data,
          pixelSpacing: spacing,
          metadata,
        })

        setCurrentImageData(data)
        setPixelSpacing(spacing)
        setDimensions({ width: data.width, height: data.height })
        onMetadataLoaded(metadata)
      } catch (err) {
        console.error("Error loading DICOM:", err)
        setError("Failed to load DICOM file. The file may be corrupted or in an unsupported format.")
      } finally {
        setLoading(false)
      }
    }

    loadCurrentImage()
  }, [files, currentIndex, onMetadataLoaded])

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 })
    setAnglePoints([])
    setFreehandPoints([])
    setSelectedAnnotationId(null)
  }, [currentIndex])

  useEffect(() => {
    if (!currentImageData || !canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const processedData = applyWindowLevel(currentImageData, windowWidth, windowCenter)
    renderDicomToCanvas(ctx, processedData, zoom, panOffset, dimensions, canvasSize)
  }, [currentImageData, windowWidth, windowCenter, zoom, panOffset, dimensions, canvasSize])

  useEffect(() => {
    if (!overlayCanvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) return

    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!showAnnotations || dimensions.width === 0) return

    const baseScale = Math.min(canvasSize.width / dimensions.width, canvasSize.height / dimensions.height) * 0.9
    const effectiveZoom = baseScale * zoom

    ctx.save()
    ctx.translate(canvasSize.width / 2 + panOffset.x, canvasSize.height / 2 + panOffset.y)
    ctx.scale(effectiveZoom, effectiveZoom)
    ctx.translate(-dimensions.width / 2, -dimensions.height / 2)

    annotations
      .filter((a) => a.frameIndex === currentIndex)
      .forEach((annotation) => {
        const isSelected = annotation.id === selectedAnnotationId
        ctx.strokeStyle = isSelected ? "#ff6600" : "#00ff00"
        ctx.lineWidth = (isSelected ? 3 : 2) / effectiveZoom
        ctx.font = `${14 / effectiveZoom}px Geist Mono, monospace`
        ctx.fillStyle = isSelected ? "#ff6600" : "#00ff00"

        switch (annotation.type) {
          case "length": {
            const { start, end } = annotation.data
            if (!start || !end) break
            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.stroke()

            ctx.beginPath()
            ctx.arc(start.x, start.y, 4 / effectiveZoom, 0, 2 * Math.PI)
            ctx.arc(end.x, end.y, 4 / effectiveZoom, 0, 2 * Math.PI)
            ctx.fill()

            let length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
            if (pixelSpacing) {
              length = length * pixelSpacing[0]
            }
            const label = `${length.toFixed(2)} ${pixelSpacing ? "mm" : "px"}`
            ctx.fillText(label, (start.x + end.x) / 2, (start.y + end.y) / 2 - 5 / effectiveZoom)
            break
          }
          case "angle": {
            const { start, mid, end } = annotation.data
            if (!start || !mid || !end) break
            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(mid.x, mid.y)
            ctx.lineTo(end.x, end.y)
            ctx.stroke()

            ctx.beginPath()
            ctx.arc(start.x, start.y, 4 / effectiveZoom, 0, 2 * Math.PI)
            ctx.fill()
            ctx.beginPath()
            ctx.arc(mid.x, mid.y, 4 / effectiveZoom, 0, 2 * Math.PI)
            ctx.fill()
            ctx.beginPath()
            ctx.arc(end.x, end.y, 4 / effectiveZoom, 0, 2 * Math.PI)
            ctx.fill()

            const angle1 = Math.atan2(start.y - mid.y, start.x - mid.x)
            const angle2 = Math.atan2(end.y - mid.y, end.x - mid.x)
            let angleDeg = Math.abs((angle1 - angle2) * (180 / Math.PI))
            if (angleDeg > 180) angleDeg = 360 - angleDeg
            ctx.fillText(`${angleDeg.toFixed(1)}°`, mid.x + 10 / effectiveZoom, mid.y - 5 / effectiveZoom)
            break
          }
          case "rectangle": {
            const { start, end } = annotation.data
            if (!start || !end) break
            ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
            break
          }
          case "ellipse": {
            const { start, end } = annotation.data
            if (!start || !end) break
            const cx = (start.x + end.x) / 2
            const cy = (start.y + end.y) / 2
            const rx = Math.abs(end.x - start.x) / 2
            const ry = Math.abs(end.y - start.y) / 2
            ctx.beginPath()
            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI)
            ctx.stroke()
            break
          }
          case "freehand": {
            const { points } = annotation.data
            if (!points || points.length < 2) break
            ctx.beginPath()
            ctx.moveTo(points[0].x, points[0].y)
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x, points[i].y)
            }
            ctx.stroke()
            break
          }
        }
      })

    if (activeTool === "angle" && anglePoints.length > 0) {
      ctx.strokeStyle = "#ffff00"
      ctx.fillStyle = "#ffff00"
      ctx.lineWidth = 2 / effectiveZoom

      anglePoints.forEach((pt) => {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 4 / effectiveZoom, 0, 2 * Math.PI)
        ctx.fill()
      })

      if (anglePoints.length >= 1) {
        ctx.beginPath()
        ctx.moveTo(anglePoints[0].x, anglePoints[0].y)
        if (anglePoints.length >= 2) {
          ctx.lineTo(anglePoints[1].x, anglePoints[1].y)
        }
        ctx.stroke()
      }

      if (anglePoints.length >= 1 && isDrawing) {
        ctx.setLineDash([5 / effectiveZoom, 5 / effectiveZoom])
        ctx.beginPath()
        ctx.moveTo(anglePoints[anglePoints.length - 1].x, anglePoints[anglePoints.length - 1].y)
        ctx.lineTo(currentDraw.x, currentDraw.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    if (activeTool === "freehand" && freehandPoints.length > 1) {
      ctx.strokeStyle = "#ffff00"
      ctx.lineWidth = 2 / effectiveZoom
      ctx.beginPath()
      ctx.moveTo(freehandPoints[0].x, freehandPoints[0].y)
      for (let i = 1; i < freehandPoints.length; i++) {
        ctx.lineTo(freehandPoints[i].x, freehandPoints[i].y)
      }
      ctx.stroke()
    }

    if (isDrawing && ["length", "rectangle", "ellipse"].includes(activeTool)) {
      ctx.strokeStyle = "#ffff00"
      ctx.lineWidth = 2 / effectiveZoom

      if (activeTool === "length") {
        ctx.beginPath()
        ctx.moveTo(drawStart.x, drawStart.y)
        ctx.lineTo(currentDraw.x, currentDraw.y)
        ctx.stroke()
      } else if (activeTool === "rectangle") {
        ctx.strokeRect(drawStart.x, drawStart.y, currentDraw.x - drawStart.x, currentDraw.y - drawStart.y)
      } else if (activeTool === "ellipse") {
        const cx = (drawStart.x + currentDraw.x) / 2
        const cy = (drawStart.y + currentDraw.y) / 2
        const rx = Math.abs(currentDraw.x - drawStart.x) / 2
        const ry = Math.abs(currentDraw.y - drawStart.y) / 2
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI)
        ctx.stroke()
      }
    }

    ctx.restore()
  }, [
    annotations,
    showAnnotations,
    currentIndex,
    zoom,
    panOffset,
    dimensions,
    canvasSize,
    isDrawing,
    drawStart,
    currentDraw,
    activeTool,
    pixelSpacing,
    anglePoints,
    freehandPoints,
    selectedAnnotationId,
  ])

  const screenToImage = useCallback(
    (screenX: number, screenY: number) => {
      if (!canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) return { x: 0, y: 0 }

      const rect = canvasRef.current.getBoundingClientRect()
      const centerX = canvasSize.width / 2
      const centerY = canvasSize.height / 2
      const baseScale = Math.min(canvasSize.width / dimensions.width, canvasSize.height / dimensions.height) * 0.9
      const effectiveZoom = baseScale * zoom

      const x = (screenX - rect.left - centerX - panOffset.x) / effectiveZoom + dimensions.width / 2
      const y = (screenY - rect.top - centerY - panOffset.y) / effectiveZoom + dimensions.height / 2

      return { x, y }
    },
    [zoom, panOffset, dimensions, canvasSize],
  )

  const findAnnotationAtPoint = useCallback(
    (imageCoords: Point): Annotation | null => {
      const threshold = 10 / zoom // 10 pixels tolerance
      const currentAnnotations = annotations.filter((a) => a.frameIndex === currentIndex)

      for (const annotation of currentAnnotations) {
        switch (annotation.type) {
          case "length": {
            const { start, end } = annotation.data
            if (!start || !end) continue
            const dist = pointToLineDistance(imageCoords, start, end)
            if (dist < threshold) return annotation
            break
          }
          case "angle": {
            const { start, mid, end } = annotation.data
            if (!start || !mid || !end) continue
            const dist1 = pointToLineDistance(imageCoords, start, mid)
            const dist2 = pointToLineDistance(imageCoords, mid, end)
            if (dist1 < threshold || dist2 < threshold) return annotation
            break
          }
          case "rectangle": {
            const { start, end } = annotation.data
            if (!start || !end) continue
            const minX = Math.min(start.x, end.x)
            const maxX = Math.max(start.x, end.x)
            const minY = Math.min(start.y, end.y)
            const maxY = Math.max(start.y, end.y)
            const nearLeft =
              Math.abs(imageCoords.x - minX) < threshold && imageCoords.y >= minY && imageCoords.y <= maxY
            const nearRight =
              Math.abs(imageCoords.x - maxX) < threshold && imageCoords.y >= minY && imageCoords.y <= maxY
            const nearTop = Math.abs(imageCoords.y - minY) < threshold && imageCoords.x >= minX && imageCoords.x <= maxX
            const nearBottom =
              Math.abs(imageCoords.y - maxY) < threshold && imageCoords.x >= minX && imageCoords.x <= maxX
            if (nearLeft || nearRight || nearTop || nearBottom) return annotation
            break
          }
          case "ellipse": {
            const { start, end } = annotation.data
            if (!start || !end) continue
            const cx = (start.x + end.x) / 2
            const cy = (start.y + end.y) / 2
            const rx = Math.abs(end.x - start.x) / 2
            const ry = Math.abs(end.y - start.y) / 2
            const normalizedX = (imageCoords.x - cx) / rx
            const normalizedY = (imageCoords.y - cy) / ry
            const dist =
              Math.abs(Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY) - 1) * Math.min(rx, ry)
            if (dist < threshold) return annotation
            break
          }
          case "freehand": {
            const { points } = annotation.data
            if (!points || points.length < 2) continue
            for (let i = 0; i < points.length - 1; i++) {
              const dist = pointToLineDistance(imageCoords, points[i], points[i + 1])
              if (dist < threshold) return annotation
            }
            break
          }
        }
      }
      return null
    },
    [annotations, currentIndex, zoom],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const imageCoords = screenToImage(e.clientX, e.clientY)
      setLastMousePos({ x: e.clientX, y: e.clientY })

      if (activeTool === "select") {
        const clickedAnnotation = findAnnotationAtPoint(imageCoords)
        if (clickedAnnotation) {
          setSelectedAnnotationId(clickedAnnotation.id)
        } else {
          setSelectedAnnotationId(null)
        }
      } else if (activeTool === "pan" || e.button === 1) {
        setIsPanning(true)
      } else if (activeTool === "windowLevel") {
        setIsAdjustingWindowLevel(true)
        setInitialWindowLevel({ width: windowWidth, center: windowCenter })
      } else if (activeTool === "angle") {
        setIsDrawing(true)
        if (anglePoints.length < 2) {
          setAnglePoints([...anglePoints, imageCoords])
        } else {
          const annotation: Annotation = {
            id: crypto.randomUUID(),
            type: "angle",
            frameIndex: currentIndex,
            data: {
              start: anglePoints[0],
              mid: anglePoints[1],
              end: imageCoords,
            },
            createdAt: new Date(),
          }
          onAddAnnotation(annotation)
          setAnglePoints([])
          setIsDrawing(false)
        }
      } else if (activeTool === "freehand") {
        setIsDrawing(true)
        setFreehandPoints([imageCoords])
      } else if (["length", "rectangle", "ellipse"].includes(activeTool)) {
        setIsDrawing(true)
        setDrawStart(imageCoords)
        setCurrentDraw(imageCoords)
      }
    },
    [
      activeTool,
      screenToImage,
      findAnnotationAtPoint,
      windowWidth,
      windowCenter,
      anglePoints,
      currentIndex,
      onAddAnnotation,
    ],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastMousePos.x
        const dy = e.clientY - lastMousePos.y
        setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
        setLastMousePos({ x: e.clientX, y: e.clientY })
      } else if (isAdjustingWindowLevel) {
        const dx = e.clientX - lastMousePos.x
        const dy = e.clientY - lastMousePos.y
        const newWidth = Math.max(1, initialWindowLevel.width + dx * 2)
        const newCenter = initialWindowLevel.center - dy * 2
        onWindowWidthChange(newWidth)
        onWindowCenterChange(newCenter)
      } else if (isDrawing) {
        const imageCoords = screenToImage(e.clientX, e.clientY)
        setCurrentDraw(imageCoords)

        if (activeTool === "freehand") {
          setFreehandPoints((prev) => [...prev, imageCoords])
        }
      }
    },
    [
      isPanning,
      isAdjustingWindowLevel,
      isDrawing,
      lastMousePos,
      screenToImage,
      activeTool,
      initialWindowLevel,
      onWindowWidthChange,
      onWindowCenterChange,
    ],
  )

  const handleMouseUp = useCallback(() => {
    if (isDrawing && (activeTool === "length" || activeTool === "rectangle" || activeTool === "ellipse")) {
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: activeTool,
        frameIndex: currentIndex,
        data: {
          start: drawStart,
          end: currentDraw,
        },
        createdAt: new Date(),
      }
      onAddAnnotation(annotation)
    }

    if (isDrawing && activeTool === "freehand" && freehandPoints.length > 2) {
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: "freehand",
        frameIndex: currentIndex,
        data: {
          points: freehandPoints,
        },
        createdAt: new Date(),
      }
      onAddAnnotation(annotation)
      setFreehandPoints([])
    }

    setIsPanning(false)
    setIsAdjustingWindowLevel(false)
    if (activeTool !== "angle") {
      setIsDrawing(false)
    }
  }, [isDrawing, activeTool, drawStart, currentDraw, currentIndex, onAddAnnotation, freehandPoints])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedAnnotationId && activeTool === "select") {
        e.preventDefault()
        onDeleteAnnotation(selectedAnnotationId)
        setSelectedAnnotationId(null)
      }
      if (e.key === "Escape" && activeTool === "angle") {
        setAnglePoints([])
        setIsDrawing(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedAnnotationId, activeTool, onDeleteAnnotation])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
  }, [])

  const getCursor = () => {
    if (isPanning) return "grabbing"
    switch (activeTool) {
      case "select":
        return "default"
      case "pan":
        return "grab"
      case "windowLevel":
        return "ns-resize"
      default:
        return "crosshair"
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full min-h-[400px] overflow-hidden bg-[var(--viewer-bg)]"
      style={{ cursor: getCursor() }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      <canvas ref={overlayCanvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading DICOM...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="max-w-md text-center p-4">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 font-mono text-xs text-green-400/80 pointer-events-none">
        <div>
          Image: {currentIndex + 1} / {files.length}
        </div>
        <div>Zoom: {Math.round(zoom * 100)}%</div>
        <div>
          W: {Math.round(windowWidth)} L: {Math.round(windowCenter)}
        </div>
        {activeTool === "angle" && anglePoints.length > 0 && (
          <div className="text-yellow-400">Click {3 - anglePoints.length} more point(s)</div>
        )}
        {activeTool === "select" && selectedAnnotationId && (
          <div className="text-orange-400">Press Delete to remove</div>
        )}
      </div>
    </div>
  )
}

function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) param = dot / lenSq

  let xx, yy

  if (param < 0) {
    xx = lineStart.x
    yy = lineStart.y
  } else if (param > 1) {
    xx = lineEnd.x
    yy = lineEnd.y
  } else {
    xx = lineStart.x + param * C
    yy = lineStart.y + param * D
  }

  const dx = point.x - xx
  const dy = point.y - yy

  return Math.sqrt(dx * dx + dy * dy)
}
