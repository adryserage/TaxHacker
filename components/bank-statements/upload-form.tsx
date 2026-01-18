"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { AlertCircle, FileSpreadsheet, Loader2, Upload, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { FileRejection, useDropzone } from "react-dropzone"
import { getBankStatementStatus, uploadBankStatement } from "@/app/(app)/bank-statements/actions"

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "text/csv": [".csv"],
  "text/plain": [".csv"],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface UploadFormProps {
  onSuccess?: (statementId: string) => void
}

export function BankStatementUploadForm({ onSuccess }: UploadFormProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0]
      if (err.message.includes("type")) {
        setError("Invalid file type. Please upload a PDF or CSV file.")
      } else if (err.message.includes("size")) {
        setError("File too large. Maximum size is 10MB.")
      } else {
        setError(err.message)
      }
      return
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: uploading || processing,
  })

  async function handleUpload() {
    if (!file) return

    setUploading(true)
    setError(null)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadBankStatement(formData)
      setProgress(30)

      if (!result.success) {
        setError(result.error || "Upload failed")
        setUploading(false)
        return
      }

      const statementId = result.data!.statementId
      setUploading(false)
      setProcessing(true)

      // Poll for processing status
      let attempts = 0
      const maxAttempts = 60 // 2 minutes max
      const pollInterval = 2000 // 2 seconds

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
        attempts++
        setProgress(30 + Math.min(attempts * 1.5, 60))

        const statusResult = await getBankStatementStatus(statementId)
        if (!statusResult.success) {
          setError(statusResult.error || "Failed to check status")
          break
        }

        const status = statusResult.data!.status
        if (status === "ready") {
          setProgress(100)
          onSuccess?.(statementId)
          router.push(`/bank-statements/${statementId}`)
          return
        } else if (status === "failed") {
          setError(statusResult.data!.errorMessage || "Processing failed")
          break
        }
      }

      if (attempts >= maxAttempts) {
        setError("Processing is taking longer than expected. Please check back later.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  function clearFile() {
    setFile(null)
    setError(null)
    setProgress(0)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={cn(
              "flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              isDragActive && "border-primary bg-primary/5",
              !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
              (uploading || processing) && "pointer-events-none opacity-50"
            )}
          >
            <input {...getInputProps()} />

            {file ? (
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-10 w-10 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFile()
                  }}
                  disabled={uploading || processing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">
                    {isDragActive ? "Drop your file here" : "Drag and drop your bank statement"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse (PDF or CSV, max 10MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(uploading || processing) && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-center text-muted-foreground">
            {uploading ? "Uploading..." : "Processing your bank statement..."}
          </p>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || uploading || processing}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : processing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload and Process
          </>
        )}
      </Button>
    </div>
  )
}
