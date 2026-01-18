"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExtractedSummary } from "@/lib/parsers/types"
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react"

interface ImportSummaryProps {
  summary: ExtractedSummary
  selectedCount: number
  duplicateCount: number
  currency?: string
}

export function ImportSummary({
  summary,
  selectedCount,
  duplicateCount,
  currency = "EUR",
}: ImportSummaryProps) {
  function formatAmount(cents: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100)
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatAmount(summary.totalDebits)}
          </div>
          <p className="text-xs text-muted-foreground">
            Money out
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {formatAmount(summary.totalCredits)}
          </div>
          <p className="text-xs text-muted-foreground">
            Money in
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary.netAmount >= 0 ? "text-green-500" : "text-destructive"}`}>
            {formatAmount(summary.netAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            Credits - Debits
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{selectedCount}</div>
          <p className="text-xs text-muted-foreground">
            of {summary.transactionCount} selected
            {duplicateCount > 0 && (
              <span className="text-yellow-500 ml-1">
                ({duplicateCount} duplicates)
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
