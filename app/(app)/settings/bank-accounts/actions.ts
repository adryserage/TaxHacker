"use server"

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  removeItem,
  isPlaidConfigured,
} from "@/lib/plaid"

/**
 * Check if Plaid is configured
 */
export async function checkPlaidConfigured(): Promise<boolean> {
  return isPlaidConfigured()
}

/**
 * Get link token for Plaid Link initialization
 */
export async function getLinkToken(): Promise<{ linkToken: string; expiration: string } | { error: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  if (!isPlaidConfigured()) {
    return { error: "Plaid is not configured" }
  }

  return createLinkToken(user.id, user.id)
}

/**
 * Connect a bank account after Plaid Link success
 */
export async function connectBankAccount(
  publicToken: string,
  metadata: {
    institutionId?: string
    institutionName?: string
    accounts: Array<{
      id: string
      name: string
      mask?: string
      type: string
      subtype?: string
    }>
  }
): Promise<{ success: boolean; connectedCount: number } | { error: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  // Exchange public token for access token
  const exchangeResult = await exchangePublicToken(publicToken)
  if ("error" in exchangeResult) {
    return exchangeResult
  }

  const { accessToken, itemId } = exchangeResult

  // Get account details from Plaid
  const accountsResult = await getAccounts(accessToken)
  if ("error" in accountsResult) {
    return accountsResult
  }

  // Store each account
  let connectedCount = 0
  for (const plaidAccount of accountsResult.accounts) {
    // Check if account already exists
    const existing = await prisma.bankAccount.findUnique({
      where: {
        userId_plaidAccountId: {
          userId: user.id,
          plaidAccountId: plaidAccount.id,
        },
      },
    })

    if (existing) {
      // Update existing account
      await prisma.bankAccount.update({
        where: { id: existing.id },
        data: {
          accessToken, // Update access token
          isActive: true,
          errorMessage: null,
          lastSyncedAt: new Date(),
        },
      })
    } else {
      // Create new account
      await prisma.bankAccount.create({
        data: {
          userId: user.id,
          plaidItemId: itemId,
          plaidAccountId: plaidAccount.id,
          accessToken,
          institutionId: metadata.institutionId || null,
          institutionName: metadata.institutionName || null,
          accountName: plaidAccount.name,
          accountType: plaidAccount.type,
          accountSubtype: plaidAccount.subtype || null,
          accountMask: plaidAccount.mask || null,
          currencyCode: plaidAccount.currencyCode,
          lastSyncedAt: new Date(),
        },
      })
    }
    connectedCount++
  }

  revalidatePath("/settings/bank-accounts")
  return { success: true, connectedCount }
}

/**
 * Get all connected bank accounts
 */
export async function getBankAccounts() {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  return prisma.bankAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      institutionName: true,
      accountName: true,
      accountType: true,
      accountSubtype: true,
      accountMask: true,
      currencyCode: true,
      isActive: true,
      lastSyncedAt: true,
      errorMessage: true,
      createdAt: true,
    },
  })
}

/**
 * Disconnect a bank account
 */
export async function disconnectBankAccount(
  accountId: string
): Promise<{ success: boolean } | { error: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId: user.id },
  })

  if (!account) {
    return { error: "Account not found" }
  }

  // Remove from Plaid
  try {
    await removeItem(account.accessToken)
  } catch {
    // Continue even if Plaid removal fails
    console.error("Failed to remove item from Plaid")
  }

  // Delete from database
  await prisma.bankAccount.delete({
    where: { id: accountId },
  })

  revalidatePath("/settings/bank-accounts")
  return { success: true }
}

/**
 * Toggle bank account active status
 */
export async function toggleBankAccount(
  accountId: string,
  isActive: boolean
): Promise<{ success: boolean } | { error: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId: user.id },
  })

  if (!account) {
    return { error: "Account not found" }
  }

  await prisma.bankAccount.update({
    where: { id: accountId },
    data: { isActive },
  })

  revalidatePath("/settings/bank-accounts")
  return { success: true }
}
