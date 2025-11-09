"use client"

import { useState } from "react"
import { Brain } from "lucide-react"
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
  currentFolder?: Folder | null
  slugPath?: string[]
}

export default function PatientDetailClient({
  patient,
  folders,
  files,
  shortcuts,
  patientId,
  currentFolder = null,
  slugPath = [],
}: PatientDetailClientProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="px-4 py-4 md:px-6 lg:px-8">
          <PatientHeader patient={patient} />
        </div>
        
        <div className="flex-1 overflow-hidden">
          <VaultContent
            currentFolder={currentFolder}
            folders={folders}
            files={files}
            shortcuts={shortcuts}
            slugPath={slugPath}
            patientId={patientId}
          />
        </div>

        {/* Floating Chat Button - Hidden when chat is open */}
        {!isChatOpen && (
          <Button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-8 right-8 z-30 hidden h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 p-0 shadow-2xl hover:from-blue-600 hover:to-orange-600 md:flex"
            title="Open AI Assistant"
          >
            <Brain className="h-7 w-7" />
          </Button>
        )}
      </div>

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

