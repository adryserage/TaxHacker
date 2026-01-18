"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExtractedTransaction } from "@/lib/parsers/types"
import { TransactionRow } from "./transaction-row"

interface TransactionPreviewProps {
  transactions: ExtractedTransaction[]
  currency?: string
  onToggleSelect: (id: string, selected: boolean) => void
  onToggleSelectAll: (selected: boolean) => void
  onUpdate: (id: string, updates: Partial<ExtractedTransaction>) => void
}

export function TransactionPreview({
  transactions,
  currency = "EUR",
  onToggleSelect,
  onToggleSelectAll,
  onUpdate,
}: TransactionPreviewProps) {
  const allSelected = transactions.every((t) => t.selected)
  const someSelected = transactions.some((t) => t.selected) && !allSelected
  const selectedCount = transactions.filter((t) => t.selected).length
  const duplicateCount = transactions.filter((t) => t.isDuplicate && t.selected).length

  function handleSelectAllChange(checked: boolean) {
    onToggleSelectAll(checked)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) {
                  (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected
                }
              }}
              onCheckedChange={handleSelectAllChange}
            />
            <span className="text-sm text-muted-foreground">
              {selectedCount} of {transactions.length} selected
            </span>
          </div>
          {duplicateCount > 0 && (
            <span className="text-sm text-yellow-600">
              ({duplicateCount} duplicates will be skipped)
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Select non-duplicates only
              transactions.forEach((t) => {
                onToggleSelect(t.id, !t.isDuplicate)
              })
            }}
          >
            Select Non-Duplicates
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-32">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                currency={currency}
                onToggleSelect={onToggleSelect}
                onUpdate={onUpdate}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No transactions found in this bank statement.
        </div>
      )}
    </div>
  )
}
