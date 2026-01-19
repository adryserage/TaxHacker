/**
 * Plaid Integration for Bank Account Connections
 *
 * To use Plaid:
 * 1. Create account at https://dashboard.plaid.com
 * 2. Get your API keys (client_id, secret)
 * 3. Set environment variables:
 *    - PLAID_CLIENT_ID
 *    - PLAID_SECRET
 *    - PLAID_ENV (sandbox, development, or production)
 */

import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid"

// Plaid configuration
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID
const PLAID_SECRET = process.env.PLAID_SECRET
const PLAID_ENV = process.env.PLAID_ENV || "sandbox"

// Check if Plaid is configured
export function isPlaidConfigured(): boolean {
  return Boolean(PLAID_CLIENT_ID && PLAID_SECRET)
}

// Create Plaid client
function createPlaidClient(): PlaidApi | null {
  if (!isPlaidConfigured()) {
    return null
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
        "PLAID-SECRET": PLAID_SECRET,
      },
    },
  })

  return new PlaidApi(configuration)
}

// Plaid client instance
let plaidClient: PlaidApi | null = null

export function getPlaidClient(): PlaidApi {
  if (!plaidClient) {
    plaidClient = createPlaidClient()
    if (!plaidClient) {
      throw new Error("Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.")
    }
  }
  return plaidClient
}

/**
 * Create a Link token for initializing Plaid Link
 */
export async function createLinkToken(
  userId: string,
  clientUserId: string
): Promise<{ linkToken: string; expiration: string } | { error: string }> {
  try {
    const client = getPlaidClient()

    const response = await client.linkTokenCreate({
      user: { client_user_id: clientUserId },
      client_name: "TaxHacker",
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca, CountryCode.Us],
      language: "en",
      webhook: process.env.PLAID_WEBHOOK_URL,
    })

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    }
  } catch (error) {
    console.error("Plaid createLinkToken error:", error)
    return { error: "Failed to create link token" }
  }
}

/**
 * Exchange a public token for an access token
 */
export async function exchangePublicToken(
  publicToken: string
): Promise<{ accessToken: string; itemId: string } | { error: string }> {
  try {
    const client = getPlaidClient()

    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    })

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    }
  } catch (error) {
    console.error("Plaid exchangePublicToken error:", error)
    return { error: "Failed to exchange public token" }
  }
}

/**
 * Get account information for a connected item
 */
export async function getAccounts(
  accessToken: string
): Promise<{ accounts: PlaidAccount[] } | { error: string }> {
  try {
    const client = getPlaidClient()

    const response = await client.accountsGet({
      access_token: accessToken,
    })

    const accounts: PlaidAccount[] = response.data.accounts.map((account) => ({
      id: account.account_id,
      name: account.name,
      officialName: account.official_name || undefined,
      type: account.type,
      subtype: account.subtype || undefined,
      mask: account.mask || undefined,
      balanceCurrent: account.balances.current,
      balanceAvailable: account.balances.available,
      currencyCode: account.balances.iso_currency_code || "CAD",
    }))

    return { accounts }
  } catch (error) {
    console.error("Plaid getAccounts error:", error)
    return { error: "Failed to get accounts" }
  }
}

/**
 * Get transactions for a connected account
 */
export async function getTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<{ transactions: PlaidTransaction[] } | { error: string }> {
  try {
    const client = getPlaidClient()

    const response = await client.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    })

    const transactions: PlaidTransaction[] = response.data.transactions.map((tx) => ({
      id: tx.transaction_id,
      accountId: tx.account_id,
      amount: Math.round(tx.amount * 100), // Convert to cents
      currencyCode: tx.iso_currency_code || "CAD",
      date: tx.date,
      name: tx.name,
      merchantName: tx.merchant_name || undefined,
      category: tx.category,
      pending: tx.pending,
    }))

    return { transactions }
  } catch (error) {
    console.error("Plaid getTransactions error:", error)
    return { error: "Failed to get transactions" }
  }
}

/**
 * Remove a connected item (revoke access)
 */
export async function removeItem(
  accessToken: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const client = getPlaidClient()

    await client.itemRemove({
      access_token: accessToken,
    })

    return { success: true }
  } catch (error) {
    console.error("Plaid removeItem error:", error)
    return { error: "Failed to remove item" }
  }
}

// Types
export interface PlaidAccount {
  id: string
  name: string
  officialName?: string
  type: string
  subtype?: string
  mask?: string
  balanceCurrent: number | null
  balanceAvailable: number | null
  currencyCode: string
}

export interface PlaidTransaction {
  id: string
  accountId: string
  amount: number // In cents
  currencyCode: string
  date: string
  name: string
  merchantName?: string
  category: string[] | null | undefined
  pending: boolean
}
