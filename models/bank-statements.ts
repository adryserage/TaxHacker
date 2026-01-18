"use server"

import { prisma } from "@/lib/db"
import { prepareJsonField } from "@/lib/db-compat"
import { BankStatement, Prisma } from "@/prisma/client"
import { unlink } from "fs/promises"
import path from "path"
import { cache } from "react"

export type BankStatementStatus = "pending" | "processing" | "ready" | "imported" | "failed"

export type BankStatementFilters = {
  status?: BankStatementStatus
  search?: string
}

export type BankStatementCreateData = {
  filename: string
  path: string
  mimetype: string
  fileSize: number
  bankName?: string | null
  accountNumber?: string | null
  periodStart?: Date | null
  periodEnd?: Date | null
}

export type BankStatementUpdateData = {
  bankName?: string | null
  accountNumber?: string | null
  periodStart?: Date | null
  periodEnd?: Date | null
  status?: BankStatementStatus
  extractedData?: unknown
  transactionCount?: number
  errorMessage?: string | null
  processedAt?: Date | null
  importedAt?: Date | null
}

/**
 * Get all bank statements for a user
 */
export const getBankStatements = cache(
  async (userId: string, filters?: BankStatementFilters): Promise<BankStatement[]> => {
    const where: Prisma.BankStatementWhereInput = { userId }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.search) {
      where.OR = [
        { filename: { contains: filters.search, mode: "insensitive" } },
        { bankName: { contains: filters.search, mode: "insensitive" } },
      ]
    }

    return await prisma.bankStatement.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
  }
)

/**
 * Get a single bank statement by ID
 */
export const getBankStatementById = cache(
  async (id: string, userId: string): Promise<BankStatement | null> => {
    return await prisma.bankStatement.findFirst({
      where: { id, userId },
    })
  }
)

/**
 * Get bank statements count by status
 */
export const getBankStatementsCount = cache(
  async (userId: string, status?: BankStatementStatus): Promise<number> => {
    return await prisma.bankStatement.count({
      where: { userId, ...(status ? { status } : {}) },
    })
  }
)

/**
 * Create a new bank statement
 */
export const createBankStatement = async (
  userId: string,
  data: BankStatementCreateData
): Promise<BankStatement> => {
  return await prisma.bankStatement.create({
    data: {
      ...data,
      user: { connect: { id: userId } },
    },
  })
}

/**
 * Update a bank statement
 */
export const updateBankStatement = async (
  id: string,
  userId: string,
  data: BankStatementUpdateData
): Promise<BankStatement> => {
  // Extract extractedData for special handling
  const { extractedData, ...restData } = data

  // Build update data
  const preparedData = {
    ...restData,
    ...(extractedData !== undefined
      ? { extractedData: extractedData ? prepareJsonField(extractedData) : undefined }
      : {}),
  }

  return await prisma.bankStatement.update({
    where: { id, userId },
    data: preparedData as unknown as Prisma.BankStatementUpdateInput,
  })
}

/**
 * Delete a bank statement and its associated file
 */
export const deleteBankStatement = async (
  id: string,
  userId: string
): Promise<BankStatement | null> => {
  const statement = await getBankStatementById(id, userId)
  if (!statement) {
    return null
  }

  // Delete the physical file
  try {
    await unlink(path.resolve(path.normalize(statement.path)))
  } catch (error) {
    console.error("Error deleting bank statement file:", error)
  }

  // Delete the database record
  return await prisma.bankStatement.delete({
    where: { id, userId },
  })
}

/**
 * Update bank statement status
 */
export const updateBankStatementStatus = async (
  id: string,
  userId: string,
  status: BankStatementStatus,
  errorMessage?: string
): Promise<BankStatement> => {
  const updateData: Prisma.BankStatementUpdateInput = { status }

  if (status === "ready" || status === "failed") {
    updateData.processedAt = new Date()
  }

  if (status === "imported") {
    updateData.importedAt = new Date()
  }

  if (errorMessage !== undefined) {
    updateData.errorMessage = errorMessage
  }

  return await prisma.bankStatement.update({
    where: { id, userId },
    data: updateData,
  })
}

/**
 * Store extracted data for a bank statement
 */
export const storeExtractedData = async (
  id: string,
  userId: string,
  extractedData: unknown,
  transactionCount: number
): Promise<BankStatement> => {
  return await prisma.bankStatement.update({
    where: { id, userId },
    data: {
      extractedData: prepareJsonField(extractedData),
      transactionCount,
      status: "ready",
      processedAt: new Date(),
    } as unknown as Prisma.BankStatementUpdateInput,
  })
}
