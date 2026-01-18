"use client"

import {
  deleteBankStatementAction,
  getExtractedTransactions,
  importBankTransactions,
  updateExtractedTransaction,
} from "@/app/(app)/bank-statements/actions"
import { DuplicateWarning } from "@/components/bank-statements/duplicate-warning"
import { ImportSummary } from "@/components/bank-statements/import-summary"
import { TransactionPreview } from "@/components/bank-statements/transaction-preview"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ExtractedData, ExtractedTransaction } from "@/lib/parsers/types"
import { ArrowLeft, CheckCircle2, Download, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

export default function BankStatementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const statementId = params.statementId as string

  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [data, setData] = useState<ExtractedData | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await getExtractedTransactions(statementId)
    if (result.success && result.data) {
      setData(result.data)
    } else {
      setError(result.error || "Failed to load transactions")
    }
    setLoading(false)
  }, [statementId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleToggleSelect(id: string, selected: boolean) {
    if (!data) return

    setData({
      ...data,
      transactions: data.transactions.map((t) =>
        t.id === id ? { ...t, selected } : t
      ),
    })
  }

  async function handleToggleSelectAll(selected: boolean) {
    if (!data) return

    setData({
      ...data,
      transactions: data.transactions.map((t) => ({ ...t, selected })),
    })
  }

  async function handleUpdate(id: string, updates: Partial<ExtractedTransaction>) {
    if (!data) return

    // Update locally first for responsiveness
    setData({
      ...data,
      transactions: data.transactions.map((t) =>
        t.id === id ? { ...t, ...updates, edited: true } : t
      ),
    })

    // Persist to server
    const result = await updateExtractedTransaction(statementId, id, updates)
    if (!result.success) {
      setError(result.error || "Failed to update transaction")
      // Reload data on error
      loadData()
    }
  }

  async function handleImport() {
    if (!data) return

    setImporting(true)
    setError(null)
    setSuccess(null)

    const selectedIds = data.transactions
      .filter((t) => t.selected)
      .map((t) => t.id)

    const result = await importBankTransactions(statementId, selectedIds, {
      skipDuplicates,
    })

    if (result.success && result.data) {
      setSuccess(
        `Successfully imported ${result.data.importedCount} transactions` +
        (result.data.skippedDuplicates > 0
          ? ` (${result.data.skippedDuplicates} duplicates skipped)`
          : "")
      )
      // Redirect to transactions page after short delay
      setTimeout(() => {
        router.push("/transactions")
      }, 2000)
    } else {
      setError(result.error || "Import failed")
    }

    setImporting(false)
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this bank statement?")) return

    setDeleting(true)
    const result = await deleteBankStatementAction(statementId)
    if (result.success) {
      router.push("/bank-statements")
    } else {
      setError(result.error || "Failed to delete")
      setDeleting(false)
    }
  }

  const selectedCount = data?.transactions.filter((t) => t.selected).length || 0
  const duplicateCount = data?.transactions.filter((t) => t.isDuplicate).length || 0
  const selectedDuplicateCount = data?.transactions.filter((t) => t.isDuplicate && t.selected).length || 0

  return (
    <>
      <header className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/bank-statements">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Review Transactions</h2>
            <p className="text-muted-foreground">
              Review and edit extracted transactions before importing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || importing}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </div>
      ) : error && !data ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <ImportSummary
            summary={data.summary}
            selectedCount={selectedCount}
            duplicateCount={selectedDuplicateCount}
          />

          {/* Duplicate Warning */}
          <DuplicateWarning
            duplicateCount={duplicateCount}
            totalCount={data.transactions.length}
          />

          {/* Success/Error Messages */}
          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">Success</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {error && data && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Extracted Transactions</CardTitle>
              <CardDescription>
                Review the transactions below. Edit any that need corrections, then import.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionPreview
                transactions={data.transactions}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onUpdate={handleUpdate}
              />
            </CardContent>
          </Card>

          {/* Import Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
                  />
                  <label
                    htmlFor="skipDuplicates"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Skip duplicate transactions
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleToggleSelectAll(true)}
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importing || selectedCount === 0}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Import {selectedCount} Transaction{selectedCount !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  )
}
