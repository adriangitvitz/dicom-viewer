"use client"

import { useState, useCallback } from "react"
import { ViewerToolbar } from "./viewer/viewer-toolbar"
import { ViewerCanvas } from "./viewer/viewer-canvas"
import { PatientInfoPanel } from "./viewer/patient-info-panel"
import { SeriesNavigator } from "./viewer/series-navigator"
import { AnnotationPanel } from "./viewer/annotation-panel"
import { FileUploader } from "./viewer/file-uploader"
import type { DicomMetadata, Tool, Annotation } from "@/lib/dicom-types"

export function DicomViewer() {
  const [files, setFiles] = useState<File[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [activeTool, setActiveTool] = useState<Tool>("pan")
  const [metadata, setMetadata] = useState<DicomMetadata | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [zoom, setZoom] = useState(1)
  const [windowWidth, setWindowWidth] = useState(400)
  const [windowCenter, setWindowCenter] = useState(40)
  const [showPatientInfo, setShowPatientInfo] = useState(true)
  const [showAnnotations, setShowAnnotations] = useState(true)

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    // Sort files by name to maintain series order
    const sortedFiles = [...selectedFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    setFiles(sortedFiles)
    setCurrentIndex(0)
    setAnnotations([])
  }, [])

  const handleMetadataLoaded = useCallback((meta: DicomMetadata) => {
    setMetadata(meta)
    if (meta.windowWidth) setWindowWidth(meta.windowWidth)
    if (meta.windowCenter) setWindowCenter(meta.windowCenter)
  }, [])

  const handleAddAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation])
  }, [])

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 10))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1))
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(1)
    if (metadata) {
      setWindowWidth(metadata.windowWidth || 400)
      setWindowCenter(metadata.windowCenter || 40)
    }
  }, [metadata])

  if (files.length === 0) {
    return <FileUploader onFilesSelected={handleFilesSelected} />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Toolbar */}
      <ViewerToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        zoom={zoom}
        windowWidth={windowWidth}
        windowCenter={windowCenter}
        onWindowWidthChange={setWindowWidth}
        onWindowCenterChange={setWindowCenter}
        showPatientInfo={showPatientInfo}
        onTogglePatientInfo={() => setShowPatientInfo(!showPatientInfo)}
        showAnnotations={showAnnotations}
        onToggleAnnotations={() => setShowAnnotations(!showAnnotations)}
        onNewStudy={() => setFiles([])}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Patient Info */}
        {showPatientInfo && metadata && <PatientInfoPanel metadata={metadata} />}

        {/* Main Viewer Area */}
        <div className="flex flex-1 flex-col">
          <ViewerCanvas
            files={files}
            currentIndex={currentIndex}
            activeTool={activeTool}
            zoom={zoom}
            windowWidth={windowWidth}
            windowCenter={windowCenter}
            onMetadataLoaded={handleMetadataLoaded}
            onAddAnnotation={handleAddAnnotation}
            annotations={annotations}
            showAnnotations={showAnnotations}
            onWindowWidthChange={setWindowWidth}
            onWindowCenterChange={setWindowCenter}
            onDeleteAnnotation={handleDeleteAnnotation}
          />

          {/* Series Navigator */}
          {files.length > 1 && (
            <SeriesNavigator totalImages={files.length} currentIndex={currentIndex} onIndexChange={setCurrentIndex} />
          )}
        </div>

        {/* Right Panel - Annotations */}
        {showAnnotations && annotations.length > 0 && (
          <AnnotationPanel annotations={annotations} onDelete={handleDeleteAnnotation} />
        )}
      </div>
    </div>
  )
}
