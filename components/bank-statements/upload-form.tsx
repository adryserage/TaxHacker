"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react"
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
const MAX_FILES = 50

interface FileStatus {
  file: File
  status: "pending" | "uploading" | "processing" | "ready" | "failed"
  error?: string
  statementId?: string
}

interface UploadFormProps {
  onSuccess?: (statementId: string) => void
}

export function BankStatementUploadForm({ onSuccess }: UploadFormProps) {
  const router = useRouter()
  const [files, setFiles] = useState<FileStatus[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map((r) => {
        const err = r.errors[0]
        if (err.code === "file-too-large") {
          return `${r.file.name}: File too large (max 10MB)`
        } else if (err.code === "file-invalid-type") {
          return `${r.file.name}: Invalid type (PDF or CSV only)`
        }
        return `${r.file.name}: ${err.message}`
      })
      setError(errors.slice(0, 3).join(". ") + (errors.length > 3 ? ` and ${errors.length - 3} more...` : ""))
    }

    if (acceptedFiles.length > 0) {
      const totalFiles = files.length + acceptedFiles.length
      if (totalFiles > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed. You tried to add ${acceptedFiles.length} files.`)
        return
      }

      const newFiles: FileStatus[] = acceptedFiles.map((file) => ({
        file,
        status: "pending",
      }))
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [files.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    disabled: isProcessing,
  })

  async function processFile(fileStatus: FileStatus, index: number): Promise<FileStatus> {
    // Update status to uploading
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: "uploading" } : f))
    )

    try {
      const formData = new FormData()
      formData.append("file", fileStatus.file)

      const result = await uploadBankStatement(formData)

      if (!result.success) {
        return { ...fileStatus, status: "failed", error: result.error || "Upload failed" }
      }

      const statementId = result.data!.statementId

      // Update status to processing
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status: "processing", statementId } : f))
      )

      // Poll for processing status
      let attempts = 0
      const maxAttempts = 60 // 2 minutes max
      const pollInterval = 2000 // 2 seconds

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
        attempts++

        const statusResult = await getBankStatementStatus(statementId)
        if (!statusResult.success) {
          return { ...fileStatus, status: "failed", error: statusResult.error || "Status check failed", statementId }
        }

        const status = statusResult.data!.status
        if (status === "ready") {
          onSuccess?.(statementId)
          return { ...fileStatus, status: "ready", statementId }
        } else if (status === "failed") {
          return { ...fileStatus, status: "failed", error: statusResult.data!.errorMessage || "Processing failed", statementId }
        }
      }

      return { ...fileStatus, status: "failed", error: "Processing timeout", statementId }
    } catch (err) {
      return { ...fileStatus, status: "failed", error: err instanceof Error ? err.message : "Unknown error" }
    }
  }

  async function handleUploadAll() {
    if (files.length === 0) return

    setIsProcessing(true)
    setError(null)

    // Process files one by one sequentially
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "pending") continue

      setCurrentIndex(i)
      const result = await processFile(files[i], i)

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? result : f))
      )
    }

    setIsProcessing(false)
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function clearAllFiles() {
    setFiles([])
    setError(null)
    setCurrentIndex(0)
  }

  const pendingCount = files.filter((f) => f.status === "pending").length
  const completedCount = files.filter((f) => f.status === "ready").length
  const failedCount = files.filter((f) => f.status === "failed").length
  const progress = files.length > 0 ? ((completedCount + failedCount) / files.length) * 100 : 0

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
              isProcessing && "pointer-events-none opacity-50"
            )}
          >
            <input {...getInputProps()} />

            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">
                {isDragActive ? "Drop your files here" : "Drag and drop your bank statements"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse (PDF or CSV, max 10MB each, up to {MAX_FILES} files)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
                {completedCount > 0 && ` (${completedCount} completed)`}
                {failedCount > 0 && ` (${failedCount} failed)`}
              </p>
              {!isProcessing && (
                <Button variant="ghost" size="sm" onClick={clearAllFiles}>
                  Clear all
                </Button>
              )}
            </div>

            {isProcessing && (
              <div className="mb-4">
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Processing file {currentIndex + 1} of {files.length}...
                </p>
              </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {files.map((fileStatus, index) => (
                <div
                  key={`${fileStatus.file.name}-${index}`}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg",
                    fileStatus.status === "ready" && "bg-green-50 dark:bg-green-950/20",
                    fileStatus.status === "failed" && "bg-red-50 dark:bg-red-950/20",
                    (fileStatus.status === "uploading" || fileStatus.status === "processing") && "bg-blue-50 dark:bg-blue-950/20"
                  )}
                >
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileStatus.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(fileStatus.file.size / 1024).toFixed(1)} KB
                      {fileStatus.status === "uploading" && " • Uploading..."}
                      {fileStatus.status === "processing" && " • Processing..."}
                      {fileStatus.status === "ready" && " • Completed"}
                      {fileStatus.status === "failed" && ` • ${fileStatus.error || "Failed"}`}
                    </p>
                  </div>
                  {fileStatus.status === "pending" && !isProcessing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {(fileStatus.status === "uploading" || fileStatus.status === "processing") && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                  {fileStatus.status === "ready" && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {fileStatus.status === "failed" && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleUploadAll}
          disabled={pendingCount === 0 || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing {currentIndex + 1} of {files.length}...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload and Process {pendingCount > 0 ? `${pendingCount} File${pendingCount !== 1 ? "s" : ""}` : ""}
            </>
          )}
        </Button>
        {completedCount > 0 && !isProcessing && (
          <Button variant="outline" onClick={() => router.push("/bank-statements")}>
            View Results
          </Button>
        )}
      </div>
    </div>
  )
}
