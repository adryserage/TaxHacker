"use client"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ExtractedTransaction } from "@/lib/parsers/types"
import { AlertTriangle, Pencil } from "lucide-react"
import { useState } from "react"

interface TransactionRowProps {
  transaction: ExtractedTransaction
  currency?: string
  onToggleSelect: (id: string, selected: boolean) => void
  onUpdate: (id: string, updates: Partial<ExtractedTransaction>) => void
}

export function TransactionRow({
  transaction,
  currency = "EUR",
  onToggleSelect,
  onUpdate,
}: TransactionRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState({
    date: transaction.date,
    description: transaction.description,
    amount: (transaction.amount / 100).toFixed(2),
    type: transaction.type,
  })

  function formatAmount(cents: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100)
  }

  function handleSave() {
    const amountInCents = Math.round(parseFloat(editValues.amount) * 100)
    onUpdate(transaction.id, {
      date: editValues.date,
      description: editValues.description,
      amount: amountInCents,
      type: editValues.type as "debit" | "credit",
    })
    setIsEditing(false)
  }

  function handleCancel() {
    setEditValues({
      date: transaction.date,
      description: transaction.description,
      amount: (transaction.amount / 100).toFixed(2),
      type: transaction.type,
    })
    setIsEditing(false)
  }

  return (
    <TableRow
      className={cn(
        transaction.isDuplicate && "bg-yellow-50 dark:bg-yellow-950/20",
        !transaction.selected && "opacity-50"
      )}
    >
      <TableCell>
        <Checkbox
          checked={transaction.selected}
          onCheckedChange={(checked) => onToggleSelect(transaction.id, checked as boolean)}
        />
      </TableCell>

      <TableCell>
        {isEditing ? (
          <Input
            type="date"
            value={editValues.date}
            onChange={(e) => setEditValues({ ...editValues, date: e.target.value })}
            className="w-36"
          />
        ) : (
          <span className="text-sm">{transaction.date}</span>
        )}
      </TableCell>

      <TableCell className="max-w-[300px]">
        {isEditing ? (
          <Input
            value={editValues.description}
            onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="truncate text-sm">{transaction.description}</span>
            {transaction.edited && (
              <Badge variant="outline" className="text-xs">
                <Pencil className="h-3 w-3 mr-1" />
                Edited
              </Badge>
            )}
          </div>
        )}
      </TableCell>

      <TableCell>
        {isEditing ? (
          <Select
            value={editValues.type}
            onValueChange={(value) => setEditValues({ ...editValues, type: value as "debit" | "credit" })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={transaction.type === "credit" ? "default" : "secondary"}>
            {transaction.type}
          </Badge>
        )}
      </TableCell>

      <TableCell className="text-right font-mono">
        {isEditing ? (
          <Input
            type="number"
            step="0.01"
            value={editValues.amount}
            onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
            className="w-28 text-right"
          />
        ) : (
          <span className={cn(
            "font-medium",
            transaction.type === "credit" ? "text-green-600" : "text-red-600"
          )}>
            {transaction.type === "credit" ? "+" : "-"}
            {formatAmount(transaction.amount)}
          </span>
        )}
      </TableCell>

      <TableCell>
        {transaction.isDuplicate && (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Duplicate
          </Badge>
        )}
        {transaction.confidence < 0.8 && !transaction.isDuplicate && (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            Low confidence
          </Badge>
        )}
      </TableCell>

      <TableCell>
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="text-xs text-green-600 hover:underline"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-primary hover:underline"
          >
            Edit
          </button>
        )}
      </TableCell>
    </TableRow>
  )
}
