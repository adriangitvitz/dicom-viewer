"use client"

import type React from "react"

import {
  MousePointer2,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Ruler,
  PenTool,
  Circle,
  Square,
  Contrast,
  User,
  MessageSquare,
  FolderOpen,
  Maximize2,
  CornerUpLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import type { Tool } from "@/lib/dicom-types"

interface ViewerToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  zoom: number
  windowWidth: number
  windowCenter: number
  onWindowWidthChange: (value: number) => void
  onWindowCenterChange: (value: number) => void
  showPatientInfo: boolean
  onTogglePatientInfo: () => void
  showAnnotations: boolean
  onToggleAnnotations: () => void
  onNewStudy: () => void
}

const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "pan", icon: Move, label: "Pan" },
  { id: "windowLevel", icon: Contrast, label: "Window/Level" },
  { id: "length", icon: Ruler, label: "Measure Length" },
  { id: "angle", icon: CornerUpLeft, label: "Measure Angle" },
  { id: "rectangle", icon: Square, label: "Rectangle ROI" },
  { id: "ellipse", icon: Circle, label: "Ellipse ROI" },
  { id: "freehand", icon: PenTool, label: "Freehand" },
]

export function ViewerToolbar({
  activeTool,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  zoom,
  windowWidth,
  windowCenter,
  onWindowWidthChange,
  onWindowCenterChange,
  showPatientInfo,
  onTogglePatientInfo,
  showAnnotations,
  onToggleAnnotations,
  onNewStudy,
}: ViewerToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 border-b border-border bg-[var(--toolbar-bg)] px-2 py-1.5">
        {/* Logo / New Study */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewStudy}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">New Study</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open new DICOM files</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Tool Selection */}
        <div className="flex items-center gap-0.5">
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool.id ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToolChange(tool.id)}
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tool.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <span className="w-14 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onResetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const elem = document.documentElement
                  if (document.fullscreenElement) {
                    document.exitFullscreen()
                  } else {
                    elem.requestFullscreen()
                  }
                }}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fullscreen</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Window/Level Controls */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-xs">
              <Contrast className="h-4 w-4" />
              <span className="hidden md:inline">
                W: {windowWidth} / L: {windowCenter}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Window Width</span>
                  <span className="text-muted-foreground">{windowWidth}</span>
                </div>
                <Slider
                  value={[windowWidth]}
                  min={1}
                  max={4000}
                  step={1}
                  onValueChange={([v]) => onWindowWidthChange(v)}
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Window Center</span>
                  <span className="text-muted-foreground">{windowCenter}</span>
                </div>
                <Slider
                  value={[windowCenter]}
                  min={-2000}
                  max={2000}
                  step={1}
                  onValueChange={([v]) => onWindowCenterChange(v)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs bg-transparent"
                  onClick={() => {
                    onWindowWidthChange(350)
                    onWindowCenterChange(40)
                  }}
                >
                  Soft Tissue
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs bg-transparent"
                  onClick={() => {
                    onWindowWidthChange(1500)
                    onWindowCenterChange(-600)
                  }}
                >
                  Lung
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs bg-transparent"
                  onClick={() => {
                    onWindowWidthChange(2500)
                    onWindowCenterChange(480)
                  }}
                >
                  Bone
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1" />

        {/* Toggle Panels */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showPatientInfo ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={onTogglePatientInfo}
              >
                <User className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Patient Info</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showAnnotations ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={onToggleAnnotations}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Annotations</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
