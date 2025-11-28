import { DicomViewer } from "@/components/dicom-viewer"

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <DicomViewer />
    </main>
  )
}
