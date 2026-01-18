"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { BankStatementStatus } from "@/components/bank-statements/statement-status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BankStatement } from "@/prisma/client"
import { format } from "date-fns"
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Plus, Trash2, Upload } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { deleteBankStatementAction, importAllBankStatements, listBankStatements } from "./actions"

export default function BankStatementsPage() {
  const [statements, setStatements] = useState<BankStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    totalImported: number
    totalSkipped: number
    statementCount: number
  } | null>(null)

  const loadStatements = useCallback(async () => {
    setLoading(true)
    const result = await listBankStatements()
    if (result.success && result.data) {
      setStatements(result.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStatements()
  }, [loadStatements])

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this bank statement?")) return

    setDeleting(id)
    const result = await deleteBankStatementAction(id)
    if (result.success) {
      setStatements((prev) => prev.filter((s) => s.id !== id))
    }
    setDeleting(null)
  }

  async function handleImportAll() {
    setImporting(true)
    setImportResult(null)

    const result = await importAllBankStatements({ skipDuplicates: true })

    if (result.success && result.data) {
      setImportResult(result.data)
      // Reload statements to update statuses
      await loadStatements()
    }

    setImporting(false)
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const readyCount = statements.filter((s) => s.status === "ready").length
  const importedCount = statements.filter((s) => s.status === "imported").length
  const processingCount = statements.filter((s) => s.status === "processing").length

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h2 className="flex flex-row gap-3 md:gap-5">
          <span className="text-3xl font-bold tracking-tight">Bank Statements</span>
          <span className="text-3xl tracking-tight opacity-20">{statements.length}</span>
        </h2>
        <div className="flex gap-2">
          {readyCount > 0 && (
            <Button
              variant="outline"
              onClick={handleImportAll}
              disabled={importing || readyCount === 0}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden md:block">Importing...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span className="hidden md:block">Import All ({readyCount})</span>
                  <span className="md:hidden">{readyCount}</span>
                </>
              )}
            </Button>
          )}
          <Link href="/bank-statements/upload">
            <Button>
              <Upload className="h-4 w-4" />
              <span className="hidden md:block">Upload Statement</span>
            </Button>
          </Link>
        </div>
      </header>

      {importResult && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            Successfully imported {importResult.totalImported} transactions from {importResult.statementCount} statement{importResult.statementCount !== 1 ? "s" : ""}.
            {importResult.totalSkipped > 0 && ` (${importResult.totalSkipped} duplicates skipped)`}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats summary */}
      {statements.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{statements.length}</div>
              <p className="text-xs text-muted-foreground">Total Statements</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{readyCount}</div>
              <p className="text-xs text-muted-foreground">Ready to Import</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{importedCount}</div>
              <p className="text-xs text-muted-foreground">Imported</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{processingCount}</div>
              <p className="text-xs text-muted-foreground">Processing</p>
            </CardContent>
          </Card>
        </div>
      )}

      <main>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : statements.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 h-full min-h-[400px]">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center max-w-md">
              No bank statements uploaded yet. Upload a PDF or CSV bank statement to extract and import transactions.
            </p>
            <Link href="/bank-statements/upload">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Your First Statement
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statements.map((statement) => (
              <Card key={statement.id} className="group relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{statement.filename}</CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {format(new Date(statement.createdAt), "PPp")}
                      </CardDescription>
                    </div>
                    <BankStatementStatus status={statement.status as "pending" | "processing" | "ready" | "failed" | "imported"} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {statement.bankName && (
                      <div className="flex justify-between">
                        <span>Bank</span>
                        <span className="font-medium text-foreground">{statement.bankName}</span>
                      </div>
                    )}
                    {statement.accountNumber && (
                      <div className="flex justify-between">
                        <span>Account</span>
                        <span className="font-medium text-foreground">****{statement.accountNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>File Size</span>
                      <span className="font-medium text-foreground">{formatFileSize(statement.fileSize)}</span>
                    </div>
                    {statement.transactionCount > 0 && (
                      <div className="flex justify-between">
                        <span>Transactions</span>
                        <span className="font-medium text-foreground">{statement.transactionCount}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    {(statement.status === "ready" || statement.status === "imported") && (
                      <Link href={`/bank-statements/${statement.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          {statement.status === "imported" ? "View" : "Review & Import"}
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(statement.id)}
                      disabled={deleting === statement.id}
                    >
                      {deleting === statement.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>

                  {statement.errorMessage && (
                    <p className="mt-3 text-xs text-destructive">{statement.errorMessage}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
