"use client"

import type React from "react"

import { User, Calendar, Hash, Activity, Building2, FileText } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { DicomMetadata } from "@/lib/dicom-types"

interface PatientInfoPanelProps {
  metadata: DicomMetadata
}

export function PatientInfoPanel({ metadata }: PatientInfoPanelProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr || "N/A"
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }

  return (
    <div className="w-64 border-r border-border bg-[var(--panel-bg)] overflow-y-auto custom-scrollbar">
      <div className="p-4">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="h-4 w-4" />
          Patient Information
        </h2>

        <div className="space-y-4">
          <InfoSection icon={User} label="Patient Name" value={metadata.patientName || "Anonymous"} />

          <InfoSection icon={Hash} label="Patient ID" value={metadata.patientId || "N/A"} />

          <InfoSection icon={Calendar} label="Birth Date" value={formatDate(metadata.patientBirthDate)} />

          <InfoSection icon={Activity} label="Sex" value={metadata.patientSex || "N/A"} />
        </div>

        <Separator className="my-4" />

        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4" />
          Study Information
        </h2>

        <div className="space-y-4">
          <InfoSection icon={FileText} label="Study Description" value={metadata.studyDescription || "N/A"} />

          <InfoSection icon={Calendar} label="Study Date" value={formatDate(metadata.studyDate)} />

          <InfoSection icon={Building2} label="Institution" value={metadata.institutionName || "N/A"} />

          <InfoSection icon={Activity} label="Modality" value={metadata.modality || "N/A"} />

          <InfoSection icon={Hash} label="Series Number" value={metadata.seriesNumber?.toString() || "N/A"} />
        </div>

        <Separator className="my-4" />

        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4" />
          Image Information
        </h2>

        <div className="space-y-4">
          <InfoSection label="Dimensions" value={`${metadata.rows || 0} × ${metadata.columns || 0}`} />

          <InfoSection
            label="Pixel Spacing"
            value={
              metadata.pixelSpacing
                ? `${metadata.pixelSpacing[0].toFixed(3)} × ${metadata.pixelSpacing[1].toFixed(3)} mm`
                : "N/A"
            }
          />

          <InfoSection
            label="Slice Thickness"
            value={metadata.sliceThickness ? `${metadata.sliceThickness.toFixed(2)} mm` : "N/A"}
          />

          <InfoSection label="Bits Stored" value={metadata.bitsStored?.toString() || "N/A"} />
        </div>
      </div>
    </div>
  )
}

function InfoSection({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType
  label: string
  value: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="text-sm text-foreground truncate" title={value}>
        {value}
      </div>
    </div>
  )
}
