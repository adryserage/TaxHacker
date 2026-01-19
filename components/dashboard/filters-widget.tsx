"use client"

import { DateRangePicker } from "@/components/forms/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTransactionFilters } from "@/hooks/use-transaction-filters"
import { TransactionFilters } from "@/models/transactions"
import { Project } from "@/prisma/client"
import { format } from "date-fns"
import { Building2 } from "lucide-react"

export function FiltersWidget({
  defaultFilters,
  defaultRange = "last-12-months",
  projects,
}: {
  defaultFilters: TransactionFilters
  defaultRange?: string
  projects?: Project[]
}) {
  const [filters, setFilters] = useTransactionFilters(defaultFilters)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {projects && projects.length > 0 && (
        <Select
          value={filters.projectCode || "all"}
          onValueChange={(value) => {
            setFilters({
              ...filters,
              projectCode: value === "all" ? undefined : value,
            })
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.code} value={project.code}>
                {project.businessName || project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <DateRangePicker
        defaultDate={{
          from: filters?.dateFrom ? new Date(filters.dateFrom) : undefined,
          to: filters?.dateTo ? new Date(filters.dateTo) : undefined,
        }}
        defaultRange={defaultRange}
        onChange={(date) => {
          setFilters({
            ...filters,
            dateFrom: date && date.from ? format(date.from, "yyyy-MM-dd") : undefined,
            dateTo: date && date.to ? format(date.to, "yyyy-MM-dd") : undefined,
          })
        }}
      />
    </div>
  )
}
