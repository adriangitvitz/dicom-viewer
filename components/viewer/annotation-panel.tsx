"use client"

import { Trash2, Ruler, Square, Circle, CornerUpLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Annotation } from "@/lib/dicom-types"

interface AnnotationPanelProps {
  annotations: Annotation[]
  onDelete: (id: string) => void
}

const typeIcons = {
  length: Ruler,
  angle: CornerUpLeft,
  rectangle: Square,
  ellipse: Circle,
  freehand: Ruler,
}

const typeLabels = {
  length: "Length",
  angle: "Angle",
  rectangle: "Rectangle ROI",
  ellipse: "Ellipse ROI",
  freehand: "Freehand",
}

export function AnnotationPanel({ annotations, onDelete }: AnnotationPanelProps) {
  return (
    <div className="w-64 border-l border-border bg-[var(--panel-bg)] overflow-y-auto custom-scrollbar">
      <div className="p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Annotations ({annotations.length})</h2>

        <div className="space-y-2">
          {annotations.map((annotation, index) => {
            const Icon = typeIcons[annotation.type] || Ruler

            return (
              <div
                key={annotation.id}
                className="group flex items-center gap-3 rounded-lg bg-secondary/50 p-3 transition-colors hover:bg-secondary"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-accent/20 text-accent">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {typeLabels[annotation.type]} #{index + 1}
                  </div>
                  <div className="text-xs text-muted-foreground">Frame {annotation.frameIndex + 1}</div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(annotation.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>

        {annotations.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No annotations yet.
            <br />
            Use the tools to add measurements.
          </div>
        )}

        {annotations.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground">
              <p className="mb-2">Keyboard shortcuts:</p>
              <ul className="space-y-1">
                <li>↑/↓ - Navigate series</li>
                <li>Home/End - First/Last image</li>
                <li>Mouse wheel - Scroll series</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
