"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import PatientHeader from "@/components/PatientHeader"
import VaultContent from "@/components/VaultContent"
import ChatAgent from "@/components/ChatAgent"
import type { Patient, Folder, File as FileType, WebsiteShortcut } from "@/types/database.types"

interface PatientDetailClientProps {
  patient: Patient
  folders: Folder[]
  files: FileType[]
  shortcuts: WebsiteShortcut[]
  patientId: string
}

export default function PatientDetailClient({
  patient,
  folders,
  files,
  shortcuts,
  patientId,
}: PatientDetailClientProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-white to-zinc-50 dark:from-black dark:to-zinc-950">
      <div className="px-4 py-4 md:px-6 lg:px-8">
        <PatientHeader patient={patient} />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <VaultContent
          currentFolder={null}
          folders={folders}
          files={files}
          shortcuts={shortcuts}
          slugPath={[]}
          patientId={patientId}
        />
      </div>

      {/* Floating Chat Button - Hidden on mobile */}
      <Button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 rounded-full p-0 shadow-2xl md:flex"
        title="Open AI Assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Chat Agent */}
      <ChatAgent
        patientId={patientId}
        patientName={patient.name}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  )
}

