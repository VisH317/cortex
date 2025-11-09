"use client"

import { useState } from "react"
import { X, Download, Maximize2, Minimize2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "./ui/button"

interface PDFPreviewProps {
  fileUrl: string
  fileName: string
  isOpen: boolean
  onClose: () => void
}

export default function PDFPreview({ fileUrl, fileName, isOpen, onClose }: PDFPreviewProps) {
  const [isFullScreen, setIsFullScreen] = useState(false)

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative flex flex-col bg-white shadow-2xl ${
                isFullScreen ? "h-full w-full" : "h-[90vh] w-full max-w-6xl rounded-2xl border border-gray-200"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <div className="flex-1">
                  <h3 className="truncate text-lg font-semibold">{fileName}</h3>
                  <p className="text-sm text-gray-600">PDF Document</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="gap-2"
                  >
                    {isFullScreen ? (
                      <>
                        <Minimize2 className="h-4 w-4" />
                        Exit Fullscreen
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-4 w-4" />
                        Fullscreen
                      </>
                    )}
                  </Button>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* PDF Viewer */}
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={fileUrl}
                  className="h-full w-full"
                  title={fileName}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

