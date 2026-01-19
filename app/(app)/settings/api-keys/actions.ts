"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import {
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  updateApiKey,
  ApiScope,
} from "@/models/api-keys"

export async function createApiKeyAction(
  name: string,
  scopes: ApiScope[],
  projectCodes?: string[]
): Promise<{ success: boolean; key?: string; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const { key } = await createApiKey(session.user.id, name, scopes, {
      projectCodes: projectCodes?.length ? projectCodes : undefined,
    })

    revalidatePath("/settings/api-keys")
    return { success: true, key }
  } catch (error) {
    console.error("Failed to create API key:", error)
    return { success: false, error: "Failed to create API key" }
  }
}

export async function revokeApiKeyAction(
  apiKeyId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const result = await revokeApiKey(session.user.id, apiKeyId)

  if (result.success) {
    revalidatePath("/settings/api-keys")
  }

  return result
}

export async function deleteApiKeyAction(
  apiKeyId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const result = await deleteApiKey(session.user.id, apiKeyId)

  if (result.success) {
    revalidatePath("/settings/api-keys")
  }

  return result
}

export async function updateApiKeyAction(
  apiKeyId: string,
  updates: {
    name?: string
    scopes?: ApiScope[]
    projectCodes?: string[] | null
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const result = await updateApiKey(session.user.id, apiKeyId, updates)

  if (result.success) {
    revalidatePath("/settings/api-keys")
  }

  return result
}
