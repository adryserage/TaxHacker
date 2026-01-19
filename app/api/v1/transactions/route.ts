import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { Prisma } from "@/prisma/client"
import {
  withApiAuth,
  apiResponse,
  apiError,
  checkProjectAccess,
  getPaginationParams,
  getDateRangeParams,
  getProjectFilter,
  getApiKeyProjectCodes,
  ApiContext,
} from "@/lib/api-auth"
import { hasScope } from "@/models/api-keys"
import { z } from "zod"

// GET /api/v1/transactions - List transactions
export const GET = withApiAuth(
  async (request: NextRequest, { userId, apiKey }: ApiContext) => {
    const { page, limit, offset } = getPaginationParams(request)
    const { from, to } = getDateRangeParams(request)
    const projectCode = getProjectFilter(request)

    // Check project access
    if (projectCode && !checkProjectAccess(apiKey, projectCode)) {
      return apiError("Access denied to this project", 403, "FORBIDDEN")
    }

    // Build where clause
    const where: Record<string, unknown> = { userId }

    if (projectCode) {
      where.projectCode = projectCode
    } else {
      // If API key has project restrictions, only return those
      const restrictedCodes = getApiKeyProjectCodes(apiKey)
      if (restrictedCodes) {
        where.projectCode = { in: restrictedCodes }
      }
    }

    if (from || to) {
      where.issuedAt = {}
      if (from) (where.issuedAt as Record<string, Date>).gte = from
      if (to) (where.issuedAt as Record<string, Date>).lte = to
    }

    // Get transactions
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          merchant: true,
          total: true,
          currencyCode: true,
          convertedTotal: true,
          convertedCurrencyCode: true,
          type: true,
          categoryCode: true,
          projectCode: true,
          issuedAt: true,
          createdAt: true,
          updatedAt: true,
          items: true,
          note: true,
          extra: true,
        },
      }),
      prisma.transaction.count({ where }),
    ])

    return apiResponse({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  },
  { requiredScopes: ["transactions:read"] }
)

// Transaction create schema
const createTransactionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  merchant: z.string().optional(),
  total: z.number().int().optional(), // Amount in cents
  currencyCode: z.string().length(3).optional(),
  type: z.enum(["income", "expense"]).optional(),
  categoryCode: z.string().optional(),
  projectCode: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().optional(),
    unitPrice: z.number().int().optional(),
    total: z.number().int().optional(),
  })).optional(),
  note: z.string().optional(),
  extra: z.record(z.unknown()).optional(),
})

// POST /api/v1/transactions - Create transaction
export const POST = withApiAuth(
  async (request: NextRequest, { userId, apiKey }: ApiContext) => {
    // Check write scope
    if (!hasScope(apiKey, "transactions:write")) {
      return apiError("Missing required scope: transactions:write", 403, "FORBIDDEN")
    }

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400, "INVALID_BODY")
    }

    // Validate
    const result = createTransactionSchema.safeParse(body)
    if (!result.success) {
      return apiError(result.error.message, 400, "VALIDATION_ERROR")
    }

    const data = result.data

    // Check project access
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

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        merchant: data.merchant,
        total: data.total,
        currencyCode: data.currencyCode,
        type: data.type,
        categoryCode: data.categoryCode,
        projectCode: data.projectCode,
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
        items: data.items ?? [],
        note: data.note,
        extra: data.extra as Prisma.InputJsonValue | undefined,
      },
    })

    return apiResponse({ data: transaction }, 201)
  },
  { requiredScopes: ["transactions:read"] }
)
