"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, FileImage, AlertCircle } from "lucide-react"

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void
}

export function FileUploader({ onFilesSelected }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFiles = (files: File[]): File[] => {
    const validFiles = files.filter((file) => {
      const ext = file.name.toLowerCase()
      return (
        ext.endsWith(".dcm") ||
        ext.endsWith(".dicom") ||
        !file.name.includes(".") || // DICOM files often have no extension
        file.type === "application/dicom"
      )
    })
    return validFiles
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      setError(null)

      const items = Array.from(e.dataTransfer.files)
      const validFiles = validateFiles(items)

      if (validFiles.length === 0) {
        setError("No valid DICOM files found. Please upload .dcm or .dicom files.")
        return
      }

      onFilesSelected(validFiles)
    },
    [onFilesSelected],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null)
      const files = Array.from(e.target.files || [])
      const validFiles = validateFiles(files)

      if (validFiles.length === 0) {
        setError("No valid DICOM files found. Please upload .dcm or .dicom files.")
        return
      }

      onFilesSelected(validFiles)
    },
    [onFilesSelected],
  )

  return (
    <div className="flex h-full items-center justify-center bg-[var(--viewer-bg)] p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-secondary p-4">
              <FileImage className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-foreground">DICOM Viewer</h1>
          <p className="text-muted-foreground">
            Upload DICOM files to view medical images with full annotation and measurement tools
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-all ${
            isDragging ? "border-accent bg-accent/10" : "border-border hover:border-muted-foreground"
          }`}
        >
          <input
            type="file"
            multiple
            accept=".dcm,.dicom,application/dicom"
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />

          <Upload className={`mx-auto mb-4 h-10 w-10 ${isDragging ? "text-accent" : "text-muted-foreground"}`} />

          <p className="mb-2 text-lg font-medium text-foreground">
            {isDragging ? "Drop files here" : "Drag & drop DICOM files"}
          </p>
          <p className="text-sm text-muted-foreground">or click to browse • Supports single files or series</p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm">
          <div className="rounded-lg bg-card p-4">
            <div className="mb-1 font-medium text-foreground">Zoom & Pan</div>
            <div className="text-xs text-muted-foreground">Navigate images with precision</div>
          </div>
          <div className="rounded-lg bg-card p-4">
            <div className="mb-1 font-medium text-foreground">Measurements</div>
            <div className="text-xs text-muted-foreground">Length, angle & area tools</div>
          </div>
          <div className="rounded-lg bg-card p-4">
            <div className="mb-1 font-medium text-foreground">Annotations</div>
            <div className="text-xs text-muted-foreground">Mark regions of interest</div>
          </div>
        </div>
      </div>
    </div>
  )
}
