"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle2, Clock, FileWarning, Loader2, Upload } from "lucide-react"

export type StatementStatus = "pending" | "processing" | "ready" | "failed" | "imported"

interface BankStatementStatusProps {
  status: StatementStatus
  className?: string
}

const statusConfig: Record<
  StatementStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon: React.ComponentType<{ className?: string }>
    className?: string
  }
> = {
  pending: {
    label: "Pending",
    variant: "secondary",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    variant: "default",
    icon: Loader2,
    className: "animate-spin",
  },
  ready: {
    label: "Ready",
    variant: "outline",
    icon: CheckCircle2,
    className: "text-green-500",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    icon: FileWarning,
  },
  imported: {
    label: "Imported",
    variant: "secondary",
    icon: Upload,
    className: "text-blue-500",
  },
}

export function BankStatementStatus({ status, className }: BankStatementStatusProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn("flex items-center gap-1", className)}>
      <Icon className={cn("h-3 w-3", config.className)} />
      <span>{config.label}</span>
    </Badge>
  )
}
