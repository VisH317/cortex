"use client"

import { useState } from "react"
import { X, Loader2, AlertTriangle, Scan } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "./ui/button"
import ReactMarkdown from "react-markdown"

interface ImageAnalysisModalProps {
  fileId: string
  fileName: string
  imageUrl: string | null
  isOpen: boolean
  onClose: () => void
}

export default function ImageAnalysisModal({
  fileId,
  fileName,
  imageUrl,
  isOpen,
  onClose,
}: ImageAnalysisModalProps) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [disclaimer, setDisclaimer] = useState<string | null>(null)

  const analyzeImage = async () => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image")
      }

      setAnalysis(data.analysis)
      setDisclaimer(data.disclaimer)
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setAnalysis(null)
    setError(null)
    setDisclaimer(null)
    onClose()
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
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Scan className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Medical Image Analysis</h3>
                    <p className="text-sm text-zinc-400">{fileName}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-2 hover:bg-white/10"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-1 gap-6 overflow-hidden p-6">
                {/* Image Preview */}
                {imageUrl && (
                  <div className="flex w-1/2 flex-col">
                    <div className="flex-1 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                      <div className="flex h-full items-center justify-center p-4">
                        <img
                          src={imageUrl}
                          alt={fileName}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Panel */}
                <div className="flex w-1/2 flex-col">
                  {!analysis && !loading && !error && (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10">
                        <Scan className="h-10 w-10 text-blue-400" />
                      </div>
                      <h4 className="mb-2 text-xl font-semibold text-white">
                        AI Medical Image Analysis
                      </h4>
                      <p className="mb-6 max-w-md text-sm text-zinc-400">
                        Click the button below to analyze this image using advanced AI. The system will identify anatomical structures and assess for potential abnormalities.
                      </p>
                      <Button
                        onClick={analyzeImage}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <Scan className="h-4 w-4" />
                        Analyze Image
                      </Button>
                      <div className="mt-6 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
                          <div className="text-left">
                            <p className="text-xs font-medium text-yellow-400">
                              Important Disclaimer
                            </p>
                            <p className="mt-1 text-xs text-yellow-400/80">
                              This AI analysis is for informational purposes only and should not replace professional medical diagnosis or treatment.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="flex flex-1 flex-col items-center justify-center">
                      <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-400" />
                      <p className="text-lg font-medium text-white">Analyzing image...</p>
                      <p className="mt-2 text-sm text-zinc-400">
                        This may take a few moments
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="flex flex-1 flex-col items-center justify-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                      </div>
                      <p className="mb-2 text-lg font-medium text-white">Analysis Failed</p>
                      <p className="mb-6 text-sm text-zinc-400">{error}</p>
                      <Button
                        onClick={analyzeImage}
                        variant="outline"
                        className="gap-2"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}

                  {analysis && (
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-white">Analysis Results</h4>
                        <Button
                          onClick={analyzeImage}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                          className="gap-2"
                        >
                          <Scan className="h-4 w-4" />
                          Reanalyze
                        </Button>
                      </div>

                      <div className="flex-1 overflow-auto rounded-lg border border-white/10 bg-zinc-950 p-6">
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mb-3 mt-4" {...props} />,
                              h2: ({ node, ...props }) => <h2 className="text-lg font-semibold text-white mb-2 mt-3" {...props} />,
                              h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-blue-300 mb-2 mt-2" {...props} />,
                              h4: ({ node, ...props }) => <h4 className="text-sm font-semibold text-zinc-300 mb-1 mt-2" {...props} />,
                              p: ({ node, ...props }) => <p className="text-sm text-zinc-200 mb-3 leading-relaxed" {...props} />,
                              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 text-zinc-200" {...props} />,
                              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-zinc-200" {...props} />,
                              li: ({ node, ...props }) => <li className="text-sm text-zinc-200" {...props} />,
                              strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
                              em: ({ node, ...props }) => <em className="italic text-zinc-300" {...props} />,
                              code: ({ node, ...props }) => <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs text-blue-300" {...props} />,
                            }}
                          >
                            {analysis}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {disclaimer && (
                        <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
                            <p className="text-xs text-yellow-400/90">{disclaimer}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

