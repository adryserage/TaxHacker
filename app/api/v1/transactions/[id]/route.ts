import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { Prisma } from "@/prisma/client"
import {
  withApiAuth,
  apiResponse,
  apiError,
  checkProjectAccess,
  ApiContext,
} from "@/lib/api-auth"
import { hasScope } from "@/models/api-keys"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/transactions/[id] - Get single transaction
export const GET = (request: NextRequest, { params }: Params) =>
  withApiAuth(
    async (request: NextRequest, { userId, apiKey }: ApiContext) => {
      const { id } = await params

      const transaction = await prisma.transaction.findFirst({
        where: { id, userId },
      })

      if (!transaction) {
        return apiError("Transaction not found", 404, "NOT_FOUND")
      }

      // Check project access
      if (transaction.projectCode && !checkProjectAccess(apiKey, transaction.projectCode)) {
        return apiError("Access denied to this project", 403, "FORBIDDEN")
      }

      return apiResponse({ data: transaction })
    },
    { requiredScopes: ["transactions:read"] }
  )(request)

// Update schema
const updateTransactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  merchant: z.string().optional(),
  total: z.number().int().optional(),
  currencyCode: z.string().length(3).optional(),
  type: z.enum(["income", "expense"]).optional(),
  categoryCode: z.string().nullable().optional(),
  projectCode: z.string().nullable().optional(),
  issuedAt: z.string().datetime().nullable().optional(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().optional(),
    unitPrice: z.number().int().optional(),
    total: z.number().int().optional(),
  })).optional(),
  note: z.string().nullable().optional(),
  extra: z.record(z.unknown()).nullable().optional(),
})

// PUT /api/v1/transactions/[id] - Update transaction
export const PUT = (request: NextRequest, { params }: Params) =>
  withApiAuth(
    async (request: NextRequest, { userId, apiKey }: ApiContext) => {
      if (!hasScope(apiKey, "transactions:write")) {
        return apiError("Missing required scope: transactions:write", 403, "FORBIDDEN")
      }

      const { id } = await params

      // Find existing
      const existing = await prisma.transaction.findFirst({
        where: { id, userId },
      })

      if (!existing) {
        return apiError("Transaction not found", 404, "NOT_FOUND")
      }

      // Check project access for existing transaction
      if (existing.projectCode && !checkProjectAccess(apiKey, existing.projectCode)) {
        return apiError("Access denied to this project", 403, "FORBIDDEN")
      }

      // Parse body
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return apiError("Invalid JSON body", 400, "INVALID_BODY")
      }

      // Validate
      const result = updateTransactionSchema.safeParse(body)
      if (!result.success) {
        return apiError(result.error.message, 400, "VALIDATION_ERROR")
      }

      const data = result.data

      // Check project access for new project
      if (data.projectCode && !checkProjectAccess(apiKey, data.projectCode)) {
        return apiError("Access denied to this project", 403, "FORBIDDEN")
      }

      // Verify category exists if provided
      if (data.categoryCode) {
        const category = await prisma.category.findUnique({
          where: { userId_code: { userId, code: data.categoryCode } },
        })
        if (!category) {
          return apiError("Category not found", 400, "CATEGORY_NOT_FOUND")
        }
      }

      // Verify project exists if provided
      if (data.projectCode) {
        const project = await prisma.project.findUnique({
          where: { userId_code: { userId, code: data.projectCode } },
        })
        if (!project) {
          return apiError("Project not found", 400, "PROJECT_NOT_FOUND")
        }
      }

      // Update
      const updated = await prisma.transaction.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          description: data.description !== undefined ? data.description : existing.description,
          merchant: data.merchant !== undefined ? data.merchant : existing.merchant,
          total: data.total ?? existing.total,
          currencyCode: data.currencyCode ?? existing.currencyCode,
          type: data.type ?? existing.type,
          categoryCode: data.categoryCode !== undefined ? data.categoryCode : existing.categoryCode,
          projectCode: data.projectCode !== undefined ? data.projectCode : existing.projectCode,
          issuedAt: data.issuedAt !== undefined
            ? data.issuedAt ? new Date(data.issuedAt) : null
            : existing.issuedAt,
          items: data.items ?? (existing.items === null ? Prisma.JsonNull : (existing.items as Prisma.InputJsonValue)),
          note: data.note !== undefined ? data.note : existing.note,
          extra: data.extra !== undefined
            ? data.extra === null ? Prisma.JsonNull : (data.extra as Prisma.InputJsonValue)
            : existing.extra === null ? Prisma.JsonNull : (existing.extra as Prisma.InputJsonValue),
        },
      })

      return apiResponse({ data: updated })
    },
    { requiredScopes: ["transactions:read"] }
  )(request)

// DELETE /api/v1/transactions/[id] - Delete transaction
export const DELETE = (request: NextRequest, { params }: Params) =>
  withApiAuth(
    async (request: NextRequest, { userId, apiKey }: ApiContext) => {
      if (!hasScope(apiKey, "transactions:write")) {
        return apiError("Missing required scope: transactions:write", 403, "FORBIDDEN")
      }

      const { id } = await params

      // Find existing
      const existing = await prisma.transaction.findFirst({
        where: { id, userId },
      })

      if (!existing) {
        return apiError("Transaction not found", 404, "NOT_FOUND")
      }

      // Check project access
      if (existing.projectCode && !checkProjectAccess(apiKey, existing.projectCode)) {
        return apiError("Access denied to this project", 403, "FORBIDDEN")
      }

      // Delete
      await prisma.transaction.delete({
        where: { id },
      })

      return apiResponse({ success: true })
    },
    { requiredScopes: ["transactions:read"] }
  )(request)
