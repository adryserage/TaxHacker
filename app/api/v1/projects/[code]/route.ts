import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import {
  withApiAuth,
  apiResponse,
  apiError,
  checkProjectAccess,
  ApiContext,
} from "@/lib/api-auth"
import { hasScope } from "@/models/api-keys"
import { z } from "zod"

type Params = { params: Promise<{ code: string }> }

// GET /api/v1/projects/[code] - Get single project
export const GET = (request: NextRequest, { params }: Params) =>
  withApiAuth(
    async (request: NextRequest, { userId, apiKey }: ApiContext) => {
      const { code } = await params

      // Check project access
      if (!checkProjectAccess(apiKey, code)) {
        return apiError("Access denied to this project", 403, "FORBIDDEN")
      }

      const project = await prisma.project.findUnique({
        where: { userId_code: { userId, code } },
      })

      if (!project) {
        return apiError("Project not found", 404, "NOT_FOUND")
      }

      return apiResponse({ data: project })
    },
    { requiredScopes: ["projects:read"] }
  )(request)

// Update schema
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  businessName: z.string().nullable().optional(),
  businessAddress: z.string().nullable().optional(),
  businessBankDetails: z.string().nullable().optional(),
  headOfficeAddress: z.string().nullable().optional(),
  billingAddress: z.string().nullable().optional(),
  province: z.string().length(2).nullable().optional(),
  taxNumber: z.string().nullable().optional(),
  provinceQstNumber: z.string().nullable().optional(),
  defaultCurrency: z.string().length(3).optional(),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(),
})

// PUT /api/v1/projects/[code] - Update project
export const PUT = (request: NextRequest, { params }: Params) =>
  withApiAuth(
    async (request: NextRequest, { userId, apiKey }: ApiContext) => {
      if (!hasScope(apiKey, "projects:write")) {
        return apiError("Missing required scope: projects:write", 403, "FORBIDDEN")
      }

      const { code } = await params

      // Check project access
      if (!checkProjectAccess(apiKey, code)) {
        return apiError("Access denied to this project", 403, "FORBIDDEN")
      }

      // Find existing
      const existing = await prisma.project.findUnique({
        where: { userId_code: { userId, code } },
      })

      if (!existing) {
        return apiError("Project not found", 404, "NOT_FOUND")
      }

      // Parse body
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return apiError("Invalid JSON body", 400, "INVALID_BODY")
      }

      // Validate
      const result = updateProjectSchema.safeParse(body)
      if (!result.success) {
        return apiError(result.error.message, 400, "VALIDATION_ERROR")
      }

      const data = result.data

      // Update
      const updated = await prisma.project.update({
        where: { userId_code: { userId, code } },
        data: {
          name: data.name ?? existing.name,
          color: data.color ?? existing.color,
          businessName: data.businessName !== undefined ? data.businessName : existing.businessName,
          businessAddress: data.businessAddress !== undefined ? data.businessAddress : existing.businessAddress,
          businessBankDetails: data.businessBankDetails !== undefined ? data.businessBankDetails : existing.businessBankDetails,
          headOfficeAddress: data.headOfficeAddress !== undefined ? data.headOfficeAddress : existing.headOfficeAddress,
          billingAddress: data.billingAddress !== undefined ? data.billingAddress : existing.billingAddress,
          province: data.province !== undefined ? data.province : existing.province,
          taxNumber: data.taxNumber !== undefined ? data.taxNumber : existing.taxNumber,
          provinceQstNumber: data.provinceQstNumber !== undefined ? data.provinceQstNumber : existing.provinceQstNumber,
          defaultCurrency: data.defaultCurrency ?? existing.defaultCurrency,
          fiscalYearStart: data.fiscalYearStart !== undefined ? data.fiscalYearStart : existing.fiscalYearStart,
        },
      })

      return apiResponse({ data: updated })
    },
    { requiredScopes: ["projects:read"] }
  )(request)

// DELETE /api/v1/projects/[code] - Delete project
export const DELETE = (request: NextRequest, { params }: Params) =>
  withApiAuth(
    async (request: NextRequest, { userId, apiKey }: ApiContext) => {
      if (!hasScope(apiKey, "projects:write")) {
        return apiError("Missing required scope: projects:write", 403, "FORBIDDEN")
      }

      const { code } = await params

      // Check project access
      if (!checkProjectAccess(apiKey, code)) {
        return apiError("Access denied to this project", 403, "FORBIDDEN")
      }

      // Find existing
      const existing = await prisma.project.findUnique({
        where: { userId_code: { userId, code } },
      })

      if (!existing) {
        return apiError("Project not found", 404, "NOT_FOUND")
      }

      // Check for transactions
      const transactionCount = await prisma.transaction.count({
        where: { userId, projectCode: code },
      })

      if (transactionCount > 0) {
        return apiError(
          `Cannot delete project with ${transactionCount} transaction(s). Remove or reassign them first.`,
          409,
          "HAS_TRANSACTIONS"
        )
      }

      // Delete
      await prisma.project.delete({
        where: { userId_code: { userId, code } },
      })

      return apiResponse({ success: true })
    },
    { requiredScopes: ["projects:read"] }
  )(request)
