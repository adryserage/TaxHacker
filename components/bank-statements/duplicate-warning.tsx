"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

interface DuplicateWarningProps {
  duplicateCount: number
  totalCount: number
}

export function DuplicateWarning({ duplicateCount, totalCount }: DuplicateWarningProps) {
  if (duplicateCount === 0) return null

  const percentage = Math.round((duplicateCount / totalCount) * 100)

  return (
    <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        Potential Duplicates Detected
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
        {duplicateCount} of {totalCount} transactions ({percentage}%) appear to already exist in your
        database. These are marked in yellow and will be skipped during import unless you deselect
        &quot;Skip duplicates&quot; option.
      </AlertDescription>
    </Alert>
  )
}
