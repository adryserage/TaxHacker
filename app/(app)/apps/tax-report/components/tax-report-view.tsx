"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Project } from "@/prisma/client"
import { format, startOfMonth, startOfQuarter, startOfYear, subMonths } from "date-fns"
import { CalendarIcon, Download, Filter, Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { getTaxReportData, type TaxReportData, type TaxReportFilters } from "../actions"

interface TaxReportViewProps {
  userId: string
  projects: Project[]
}

export function TaxReportView({ userId, projects }: TaxReportViewProps) {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<TaxReportData | null>(null)
  const [filters, setFilters] = useState<TaxReportFilters>({
    dateFrom: format(startOfQuarter(new Date()), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
  })

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTaxReportData(userId, projects, filters)
      setReportData(data)
    } catch (error) {
      console.error("Failed to load tax report:", error)
    } finally {
      setLoading(false)
    }
  }, [userId, projects, filters])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleQuickFilter = (preset: "month" | "quarter" | "ytd" | "last-quarter") => {
    const now = new Date()
    let dateFrom: Date
    let dateTo: Date = now

    switch (preset) {
      case "month":
        dateFrom = startOfMonth(now)
        break
      case "quarter":
        dateFrom = startOfQuarter(now)
        break
      case "ytd":
        dateFrom = startOfYear(now)
        break
      case "last-quarter":
        dateFrom = startOfQuarter(subMonths(now, 3))
        dateTo = subMonths(startOfQuarter(now), 1)
        break
    }

    setFilters({
      ...filters,
      dateFrom: format(dateFrom, "yyyy-MM-dd"),
      dateTo: format(dateTo, "yyyy-MM-dd"),
    })
  }

  const handleExportCSV = () => {
    if (!reportData) return

    const rows = [
      ["Company", "Province", "Tax Type", "Income", "Expenses", "Net", "GST/TPS", "PST", "QST/TVQ", "HST"],
      ...reportData.summaries.map((s) => [
        s.projectName,
        s.provinceName || "N/A",
        s.taxType || "N/A",
        (s.totalIncome / 100).toFixed(2),
        (s.totalExpense / 100).toFixed(2),
        (s.netIncome / 100).toFixed(2),
        ((s.estimatedTaxes?.gst || 0) / 100).toFixed(2),
        ((s.estimatedTaxes?.pst || 0) / 100).toFixed(2),
        ((s.estimatedTaxes?.qst || 0) / 100).toFixed(2),
        ((s.estimatedTaxes?.hst || 0) / 100).toFixed(2),
      ]),
      [],
      [
        "TOTALS",
        "",
        "",
        (reportData.totals.totalIncome / 100).toFixed(2),
        (reportData.totals.totalExpense / 100).toFixed(2),
        (reportData.totals.netIncome / 100).toFixed(2),
        (reportData.totals.estimatedGst / 100).toFixed(2),
        (reportData.totals.estimatedPst / 100).toFixed(2),
        (reportData.totals.estimatedQst / 100).toFixed(2),
        (reportData.totals.estimatedHst / 100).toFixed(2),
      ],
    ]

    const csvContent = rows.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `tax-report-${filters.dateFrom}-to-${filters.dateTo}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">From</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="pl-10 pr-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">To</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="pl-10 pr-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Company</label>
              <select
                value={filters.projectCode || ""}
                onChange={(e) => setFilters({ ...filters, projectCode: e.target.value || undefined })}
                className="px-3 py-2 border rounded-md min-w-[150px]"
              >
                <option value="">All Companies</option>
                {projects.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.businessName || p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickFilter("month")}>
                This Month
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickFilter("quarter")}>
                This Quarter
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickFilter("ytd")}>
                Year to Date
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickFilter("last-quarter")}>
                Last Quarter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reportData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Income</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {formatCurrency(reportData.totals.totalIncome, "CAD")}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Expenses</CardDescription>
                <CardTitle className="text-2xl text-red-600">
                  {formatCurrency(reportData.totals.totalExpense, "CAD")}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net Income</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(reportData.totals.netIncome, "CAD")}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Est. Taxes Collected</CardDescription>
                <CardTitle className="text-2xl text-blue-600">
                  {formatCurrency(
                    reportData.totals.estimatedGst +
                      reportData.totals.estimatedPst +
                      reportData.totals.estimatedQst +
                      reportData.totals.estimatedHst,
                    "CAD"
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Tax Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Tax Summary by Company</CardTitle>
                  <CardDescription>
                    Estimated tax breakdown based on company province configuration
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reportData.summaries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions found for the selected period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Company</th>
                        <th className="text-left py-3 px-2 font-medium">Province</th>
                        <th className="text-left py-3 px-2 font-medium">Tax Type</th>
                        <th className="text-right py-3 px-2 font-medium">Income</th>
                        <th className="text-right py-3 px-2 font-medium">Expenses</th>
                        <th className="text-right py-3 px-2 font-medium">Net</th>
                        <th className="text-right py-3 px-2 font-medium">GST/TPS</th>
                        <th className="text-right py-3 px-2 font-medium">PST</th>
                        <th className="text-right py-3 px-2 font-medium">QST/TVQ</th>
                        <th className="text-right py-3 px-2 font-medium">HST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.summaries.map((summary) => (
                        <tr key={summary.projectCode} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 font-medium">{summary.projectName}</td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {summary.provinceName || "—"}
                          </td>
                          <td className="py-3 px-2">
                            {summary.taxType ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {summary.taxType}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-2 text-right text-green-600">
                            {formatCurrency(summary.totalIncome, "CAD")}
                          </td>
                          <td className="py-3 px-2 text-right text-red-600">
                            {formatCurrency(summary.totalExpense, "CAD")}
                          </td>
                          <td className="py-3 px-2 text-right font-medium">
                            {formatCurrency(summary.netIncome, "CAD")}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {summary.estimatedTaxes?.gst
                              ? formatCurrency(summary.estimatedTaxes.gst, "CAD")
                              : "—"}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {summary.estimatedTaxes?.pst
                              ? formatCurrency(summary.estimatedTaxes.pst, "CAD")
                              : "—"}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {summary.estimatedTaxes?.qst
                              ? formatCurrency(summary.estimatedTaxes.qst, "CAD")
                              : "—"}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {summary.estimatedTaxes?.hst
                              ? formatCurrency(summary.estimatedTaxes.hst, "CAD")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 font-bold">
                        <td className="py-3 px-2" colSpan={3}>
                          TOTALS
                        </td>
                        <td className="py-3 px-2 text-right text-green-600">
                          {formatCurrency(reportData.totals.totalIncome, "CAD")}
                        </td>
                        <td className="py-3 px-2 text-right text-red-600">
                          {formatCurrency(reportData.totals.totalExpense, "CAD")}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {formatCurrency(reportData.totals.netIncome, "CAD")}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {formatCurrency(reportData.totals.estimatedGst, "CAD")}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {formatCurrency(reportData.totals.estimatedPst, "CAD")}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {formatCurrency(reportData.totals.estimatedQst, "CAD")}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {formatCurrency(reportData.totals.estimatedHst, "CAD")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Important Note */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Tax estimates are calculated based on income amounts and each
                company&apos;s configured province. These are estimates only - consult with a tax
                professional for accurate GST/HST/QST filing. Input Tax Credits (ITCs) from expenses
                are not included in this estimate.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-8">Failed to load report data.</p>
      )}
    </div>
  )
}
