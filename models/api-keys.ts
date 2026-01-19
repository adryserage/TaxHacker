import { prisma } from "@/lib/db"
import { ApiKey } from "@/prisma/client"
import { createHash, randomBytes } from "crypto"
import { cache } from "react"

/**
 * Parse scopes from ApiKey (handles both JSON string for SQLite and array for PostgreSQL)
 */
function parseScopes(scopes: unknown): string[] {
  if (Array.isArray(scopes)) return scopes as string[]
  if (typeof scopes === "string") {
    try {
      const parsed = JSON.parse(scopes)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Parse projectCodes from ApiKey (handles both JSON string for SQLite and array for PostgreSQL)
 */
function parseProjectCodes(projectCodes: unknown): string[] | null {
  if (!projectCodes) return null
  if (Array.isArray(projectCodes)) return projectCodes as string[]
  if (typeof projectCodes === "string") {
    try {
      const parsed = JSON.parse(projectCodes)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

// API Scopes
export const API_SCOPES = {
  "transactions:read": "Read transactions",
  "transactions:write": "Create/update transactions",
  "projects:read": "Read projects",
  "projects:write": "Create/update projects",
  "categories:read": "Read categories",
  "categories:write": "Create/update categories",
  "invoices:read": "Read invoices",
  "invoices:write": "Create/update invoices",
  "reports:read": "Read reports and analytics",
} as const

export type ApiScope = keyof typeof API_SCOPES

export type ApiKeyWithoutHash = Omit<ApiKey, "keyHash">

/**
 * Generate a new API key
 * Returns the full key (only shown once) and the key data
 */
export async function createApiKey(
  userId: string,
  name: string,
  scopes: ApiScope[],
  options?: {
    projectCodes?: string[]
    expiresAt?: Date
    rateLimit?: number
  }
): Promise<{ key: string; apiKey: ApiKey }> {
  // Generate a random key: th_live_xxxxxxxxxxxx
  const keyBytes = randomBytes(24)
  const keyValue = keyBytes.toString("base64url")
  const fullKey = `th_live_${keyValue}`

  // Hash the key for storage
  const keyHash = createHash("sha256").update(fullKey).digest("hex")
  const keyPrefix = fullKey.substring(0, 12) // "th_live_xxxx"

  // Use 'as never' to handle both PostgreSQL (Json type) and SQLite (String type)
  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      keyPrefix,
      scopes: scopes as never,
      projectCodes: (options?.projectCodes ?? null) as never,
      expiresAt: options?.expiresAt ?? null,
      rateLimit: options?.rateLimit ?? 1000,
    },
  })

  return { key: fullKey, apiKey }
}

/**
 * Validate an API key and return the associated data
 */
export async function validateApiKey(
  key: string
): Promise<{ valid: false; error: string } | { valid: true; apiKey: ApiKey; userId: string }> {
  // Check format
  if (!key.startsWith("th_live_")) {
    return { valid: false, error: "Invalid API key format" }
  }

  // Hash the key
  const keyHash = createHash("sha256").update(key).digest("hex")

  // Find the key
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  })

  if (!apiKey) {
    return { valid: false, error: "API key not found" }
  }

  // Check if active
  if (!apiKey.isActive) {
    return { valid: false, error: "API key is inactive" }
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: "API key has expired" }
  }

  // Update usage stats (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  }).catch(() => {})

  return { valid: true, apiKey, userId: apiKey.userId }
}

/**
 * Check if an API key has a specific scope
 */
export function hasScope(apiKey: ApiKey, scope: ApiScope): boolean {
  const scopes = parseScopes(apiKey.scopes)
  return scopes.includes(scope) || scopes.includes("*")
}

/**
 * Check if an API key has access to a specific project
 */
export function hasProjectAccess(apiKey: ApiKey, projectCode: string): boolean {
  const codes = parseProjectCodes(apiKey.projectCodes)
  if (codes === null) {
    return true // No restriction
  }
  return codes.includes(projectCode)
}

/**
 * Get all API keys for a user (without the hash)
 */
export const getApiKeys = cache(async (userId: string): Promise<ApiKeyWithoutHash[]> => {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  // Remove the hash from the response
  return keys.map(({ keyHash, ...rest }) => rest)
})

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  userId: string,
  apiKeyId: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
  })

  if (!apiKey) {
    return { success: false, error: "API key not found" }
  }

  if (apiKey.userId !== userId) {
    return { success: false, error: "Not authorized" }
  }

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      isActive: false,
      revokedAt: new Date(),
    },
  })

  return { success: true }
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(
  userId: string,
  apiKeyId: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
  })

  if (!apiKey) {
    return { success: false, error: "API key not found" }
  }

  if (apiKey.userId !== userId) {
    return { success: false, error: "Not authorized" }
  }

  await prisma.apiKey.delete({
    where: { id: apiKeyId },
  })

  return { success: true }
}

/**
 * Update API key scopes or settings
 */
export async function updateApiKey(
  userId: string,
  apiKeyId: string,
  updates: {
    name?: string
    scopes?: ApiScope[]
    projectCodes?: string[] | null
    rateLimit?: number
    expiresAt?: Date | null
  }
): Promise<{ success: boolean; error?: string }> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
  })

  if (!apiKey) {
    return { success: false, error: "API key not found" }
  }

  if (apiKey.userId !== userId) {
    return { success: false, error: "Not authorized" }
  }

  // Use 'as never' to handle both PostgreSQL (Json type) and SQLite (String type)
  const scopesValue = updates.scopes ?? parseScopes(apiKey.scopes)
  const projectCodesValue = updates.projectCodes !== undefined
    ? updates.projectCodes
    : parseProjectCodes(apiKey.projectCodes)

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      name: updates.name ?? apiKey.name,
      scopes: scopesValue as never,
      projectCodes: projectCodesValue as never,
      rateLimit: updates.rateLimit ?? apiKey.rateLimit,
      expiresAt: updates.expiresAt !== undefined ? updates.expiresAt : apiKey.expiresAt,
    },
  })

  return { success: true }
}
