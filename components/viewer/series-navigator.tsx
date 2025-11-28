"use client"

import type React from "react"

import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useCallback, useEffect } from "react"

interface SeriesNavigatorProps {
  totalImages: number
  currentIndex: number
  onIndexChange: (index: number) => void
}

export function SeriesNavigator({ totalImages, currentIndex, onIndexChange }: SeriesNavigatorProps) {
  const goToFirst = useCallback(() => onIndexChange(0), [onIndexChange])
  const goToLast = useCallback(() => onIndexChange(totalImages - 1), [onIndexChange, totalImages])
  const goToPrevious = useCallback(() => onIndexChange(Math.max(0, currentIndex - 1)), [onIndexChange, currentIndex])
  const goToNext = useCallback(
    () => onIndexChange(Math.min(totalImages - 1, currentIndex + 1)),
    [onIndexChange, currentIndex, totalImages],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault()
        goToNext()
      } else if (e.key === "Home") {
        e.preventDefault()
        goToFirst()
      } else if (e.key === "End") {
        e.preventDefault()
        goToLast()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToPrevious, goToNext, goToFirst, goToLast])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (e.deltaY > 0) {
        goToNext()
      } else {
        goToPrevious()
      }
    },
    [goToNext, goToPrevious],
  )

  return (
    <div className="flex items-center gap-3 border-t border-border bg-[var(--toolbar-bg)] px-4 py-2">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToFirst} disabled={currentIndex === 0}>
        <SkipBack className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevious} disabled={currentIndex === 0}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex flex-1 items-center gap-3" onWheel={handleWheel}>
        <Slider
          value={[currentIndex]}
          min={0}
          max={totalImages - 1}
          step={1}
          onValueChange={([v]) => onIndexChange(v)}
          className="flex-1"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={goToNext}
        disabled={currentIndex === totalImages - 1}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={goToLast}
        disabled={currentIndex === totalImages - 1}
      >
        <SkipForward className="h-4 w-4" />
      </Button>

      <div className="w-24 text-center font-mono text-sm text-muted-foreground">
        {currentIndex + 1} / {totalImages}
      </div>
    </div>
  )
}
