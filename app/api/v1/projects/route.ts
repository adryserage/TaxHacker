import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import {
  withApiAuth,
  apiResponse,
  apiError,
  getPaginationParams,
  getApiKeyProjectCodes,
  ApiContext,
} from "@/lib/api-auth"
import { hasScope } from "@/models/api-keys"
import { z } from "zod"

// GET /api/v1/projects - List projects
export const GET = withApiAuth(
  async (request: NextRequest, { userId, apiKey }: ApiContext) => {
    const { page, limit, offset } = getPaginationParams(request)

    // Build where clause
    const where: Record<string, unknown> = { userId }

    // If API key has project restrictions, only return those
    const projectCodes = getApiKeyProjectCodes(apiKey)
    if (projectCodes) {
      where.code = { in: projectCodes }
    }

    // Get projects
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          code: true,
          name: true,
          color: true,
          businessName: true,
          businessAddress: true,
          province: true,
          taxNumber: true,
          provinceQstNumber: true,
          defaultCurrency: true,
          fiscalYearStart: true,
          createdAt: true,
        },
      }),
      prisma.project.count({ where }),
    ])

    return apiResponse({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  },
  { requiredScopes: ["projects:read"] }
)

// Project create schema
const createProjectSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Code must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  province: z.string().length(2).optional(),
  taxNumber: z.string().optional(),
  provinceQstNumber: z.string().optional(),
  defaultCurrency: z.string().length(3).optional(),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/).optional(), // "MM-DD"
})

// POST /api/v1/projects - Create project
export const POST = withApiAuth(
  async (request: NextRequest, { userId, apiKey }: ApiContext) => {
    // Check write scope
    if (!hasScope(apiKey, "projects:write")) {
      return apiError("Missing required scope: projects:write", 403, "FORBIDDEN")
    }

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400, "INVALID_BODY")
    }

    // Validate
    const result = createProjectSchema.safeParse(body)
    if (!result.success) {
      return apiError(result.error.message, 400, "VALIDATION_ERROR")
    }

    const data = result.data

    // Check if code already exists
    const existing = await prisma.project.findUnique({
      where: { userId_code: { userId, code: data.code } },
    })

    if (existing) {
      return apiError("Project code already exists", 409, "CONFLICT")
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        userId,
        code: data.code,
        name: data.name,
        color: data.color ?? "#000000",
        businessName: data.businessName,
        businessAddress: data.businessAddress,
        province: data.province,
        taxNumber: data.taxNumber,
        provinceQstNumber: data.provinceQstNumber,
        defaultCurrency: data.defaultCurrency ?? "CAD",
        fiscalYearStart: data.fiscalYearStart,
      },
    })

    return apiResponse({ data: project }, 201)
  },
  { requiredScopes: ["projects:read"] }
)
