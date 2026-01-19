import { NextRequest, NextResponse } from "next/server"
import { ApiKey } from "@/prisma/client"
import { validateApiKey, hasScope, hasProjectAccess, ApiScope } from "@/models/api-keys"

export interface ApiContext {
  userId: string
  apiKey: ApiKey
}

export type ApiHandler = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse>

/**
 * API response helper
 */
export function apiResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

/**
 * API error response helper
 */
export function apiError(
  message: string,
  status = 400,
  code?: string
): NextResponse<{ error: string; code?: string }> {
  return NextResponse.json(
    { error: message, ...(code && { code }) },
    { status }
  )
}

/**
 * Wrapper for API route handlers that require authentication
 */
export function withApiAuth(
  handler: ApiHandler,
  options?: {
    requiredScopes?: ApiScope[]
  }
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    // Get API key from header
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      return apiError("Missing Authorization header", 401, "UNAUTHORIZED")
    }

    // Support both "Bearer xxx" and just "xxx"
    const key = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader

    // Validate the key
    const result = await validateApiKey(key)

    if (!result.valid) {
      return apiError(result.error, 401, "INVALID_API_KEY")
    }

    const { apiKey, userId } = result

    // Check required scopes
    if (options?.requiredScopes) {
      for (const scope of options.requiredScopes) {
        if (!hasScope(apiKey, scope)) {
          return apiError(
            `Missing required scope: ${scope}`,
            403,
            "FORBIDDEN"
          )
        }
      }
    }

    // Call the handler with context
    try {
      return await handler(request, { userId, apiKey })
    } catch (error) {
      console.error("API handler error:", error)
      return apiError(
        error instanceof Error ? error.message : "Internal server error",
        500,
        "INTERNAL_ERROR"
      )
    }
  }
}

/**
 * Check project access for an API request
 */
export function checkProjectAccess(apiKey: ApiKey, projectCode: string | null): boolean {
  if (!projectCode) return true
  return hasProjectAccess(apiKey, projectCode)
}

/**
 * Parse pagination parameters from request
 */
export function getPaginationParams(request: NextRequest): {
  page: number
  limit: number
  offset: number
} {
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Parse date range parameters from request
 */
export function getDateRangeParams(request: NextRequest): {
  from?: Date
  to?: Date
} {
  const url = new URL(request.url)
  const fromStr = url.searchParams.get("from")
  const toStr = url.searchParams.get("to")

  return {
    from: fromStr ? new Date(fromStr) : undefined,
    to: toStr ? new Date(toStr) : undefined,
  }
}

/**
 * Parse project filter from request
 */
export function getProjectFilter(request: NextRequest): string | undefined {
  const url = new URL(request.url)
  return url.searchParams.get("project") || undefined
}
