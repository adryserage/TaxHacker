"use client"

import { BankStatementStatus } from "@/components/bank-statements/statement-status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BankStatement } from "@/prisma/client"
import { format } from "date-fns"
import { FileSpreadsheet, Plus, Trash2, Upload } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { deleteBankStatementAction, listBankStatements } from "./actions"

export default function BankStatementsPage() {
  const [statements, setStatements] = useState<BankStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadStatements()
  }, [])

  async function loadStatements() {
    setLoading(true)
    const result = await listBankStatements()
    if (result.success && result.data) {
      setStatements(result.data)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this bank statement?")) return

    setDeleting(id)
    const result = await deleteBankStatementAction(id)
    if (result.success) {
      setStatements((prev) => prev.filter((s) => s.id !== id))
    }
    setDeleting(null)
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h2 className="flex flex-row gap-3 md:gap-5">
          <span className="text-3xl font-bold tracking-tight">Bank Statements</span>
          <span className="text-3xl tracking-tight opacity-20">{statements.length}</span>
        </h2>
        <Link href="/bank-statements/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Statement
          </Button>
        </Link>
      </header>

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
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{statement.filename}</CardTitle>
                      <CardDescription className="mt-1">
                        {format(new Date(statement.createdAt), "PPp")}
                      </CardDescription>
                    </div>
                    <BankStatementStatus status={statement.status as "pending" | "processing" | "ready" | "failed" | "imported"} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
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

                  <div className="flex gap-2 mt-4">
                    {(statement.status === "ready" || statement.status === "imported") && (
                      <Link href={`/bank-statements/${statement.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          {statement.status === "imported" ? "View" : "Review"}
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(statement.id)}
                      disabled={deleting === statement.id}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
