"use server"

import {
  calculateTaxes,
  CANADIAN_PROVINCES,
  isValidProvinceCode,
  type ProvinceCode,
  type TaxBreakdown,
} from "@/lib/canadian-taxes"
import { prisma } from "@/lib/db"
import { Project } from "@/prisma/client"

export interface TaxReportFilters {
  projectCode?: string
  dateFrom?: string
  dateTo?: string
}

export interface ProjectTaxSummary {
  projectCode: string
  projectName: string
  province: string | null
  provinceName: string | null
  taxType: string | null
  incomeCount: number
  expenseCount: number
  totalIncome: number // in cents
  totalExpense: number // in cents
  netIncome: number // in cents
  estimatedTaxes: TaxBreakdown | null
}

export interface TaxReportData {
  summaries: ProjectTaxSummary[]
  totals: {
    totalIncome: number
    totalExpense: number
    netIncome: number
    estimatedGst: number
    estimatedPst: number
    estimatedQst: number
    estimatedHst: number
  }
  filters: TaxReportFilters
}

export async function getTaxReportData(
  userId: string,
  projects: Project[],
  filters: TaxReportFilters
): Promise<TaxReportData> {
  const whereClause: Record<string, unknown> = { userId }

  if (filters.projectCode) {
    whereClause.projectCode = filters.projectCode
  }

  if (filters.dateFrom || filters.dateTo) {
    whereClause.issuedAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    }
  }

  // Get all transactions grouped by project and type
  const transactions = await prisma.transaction.groupBy({
    by: ["projectCode", "type"],
    where: whereClause,
    _sum: {
      total: true,
    },
    _count: {
      id: true,
    },
  })

  // Build summaries per project
  const projectSummaryMap = new Map<string, ProjectTaxSummary>()

  // Initialize with all projects
  for (const project of projects) {
    const provinceConfig =
      project.province && isValidProvinceCode(project.province)
        ? CANADIAN_PROVINCES[project.province as ProvinceCode]
        : null

    projectSummaryMap.set(project.code, {
      projectCode: project.code,
      projectName: project.businessName || project.name,
      province: project.province,
      provinceName: provinceConfig?.name || null,
      taxType: provinceConfig?.taxType || null,
      incomeCount: 0,
      expenseCount: 0,
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      estimatedTaxes: null,
    })
  }

  // Add "Unassigned" for transactions without project
  projectSummaryMap.set("__unassigned__", {
    projectCode: "__unassigned__",
    projectName: "Unassigned",
    province: null,
    provinceName: null,
    taxType: null,
    incomeCount: 0,
    expenseCount: 0,
    totalIncome: 0,
    totalExpense: 0,
    netIncome: 0,
    estimatedTaxes: null,
  })

  // Aggregate transaction data
  for (const tx of transactions) {
    const projectCode = tx.projectCode || "__unassigned__"
    const summary = projectSummaryMap.get(projectCode)

    if (summary) {
      const amount = tx._sum.total || 0
      const count = tx._count.id

      if (tx.type === "income") {
        summary.incomeCount += count
        summary.totalIncome += amount
      } else {
        summary.expenseCount += count
        summary.totalExpense += Math.abs(amount)
      }
    }
  }

  // Calculate net income and estimated taxes
  for (const summary of projectSummaryMap.values()) {
    summary.netIncome = summary.totalIncome - summary.totalExpense

    // Calculate estimated taxes based on income (assuming taxes collected on sales)
    if (summary.totalIncome > 0 && summary.province && isValidProvinceCode(summary.province)) {
      // Reverse calculate: if total includes tax, find the pre-tax amount
      // For simplicity, we'll estimate based on the tax rate
      summary.estimatedTaxes = calculateTaxes(summary.totalIncome, summary.province as ProvinceCode)
    }
  }

  // Convert to array and filter out empty projects (unless specifically filtered)
  let summaries = Array.from(projectSummaryMap.values())
  if (!filters.projectCode) {
    summaries = summaries.filter(
      (s) => s.incomeCount > 0 || s.expenseCount > 0 || s.projectCode === filters.projectCode
    )
  }

  // Sort by project name
  summaries.sort((a, b) => a.projectName.localeCompare(b.projectName))

  // Calculate totals
  const totals = {
    totalIncome: summaries.reduce((sum, s) => sum + s.totalIncome, 0),
    totalExpense: summaries.reduce((sum, s) => sum + s.totalExpense, 0),
    netIncome: summaries.reduce((sum, s) => sum + s.netIncome, 0),
    estimatedGst: summaries.reduce((sum, s) => sum + (s.estimatedTaxes?.gst || 0), 0),
    estimatedPst: summaries.reduce((sum, s) => sum + (s.estimatedTaxes?.pst || 0), 0),
    estimatedQst: summaries.reduce((sum, s) => sum + (s.estimatedTaxes?.qst || 0), 0),
    estimatedHst: summaries.reduce((sum, s) => sum + (s.estimatedTaxes?.hst || 0), 0),
  }

  return {
    summaries,
    totals,
    filters,
  }
}
