"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getLinkToken, connectBankAccount } from "../actions"

interface ConnectBankButtonProps {
  isConfigured: boolean
}

export function ConnectBankButton({ isConfigured }: ConnectBankButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!isConfigured) {
      toast.error("Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET environment variables.")
      return
    }

    setLoading(true)
    try {
      // Get link token
      const tokenResult = await getLinkToken()
      if ("error" in tokenResult) {
        toast.error(tokenResult.error)
        setLoading(false)
        return
      }

      // Check if Plaid Link script is loaded
      if (typeof window === "undefined" || !("Plaid" in window)) {
        // Load Plaid Link script dynamically
        await loadPlaidScript()
      }

      // Initialize Plaid Link
      const Plaid = (window as unknown as { Plaid: PlaidLinkFactory }).Plaid
      const handler = Plaid.create({
        token: tokenResult.linkToken,
        onSuccess: async (publicToken: string, metadata: PlaidLinkMetadata) => {
          setLoading(true)
          try {
            const result = await connectBankAccount(publicToken, {
              institutionId: metadata.institution?.institution_id,
              institutionName: metadata.institution?.name,
              accounts: metadata.accounts.map((a) => ({
                id: a.id,
                name: a.name,
                mask: a.mask ?? undefined,
                type: a.type,
                subtype: a.subtype ?? undefined,
              })),
            })
            if ("error" in result) {
              toast.error(result.error)
            } else {
              toast.success(`Connected ${result.connectedCount} account(s)`)
            }
          } catch {
            toast.error("Failed to connect bank account")
          } finally {
            setLoading(false)
          }
        },
        onExit: (err: PlaidLinkError | null) => {
          setLoading(false)
          if (err) {
            console.error("Plaid Link exit error:", err)
          }
        },
      })

      handler.open()
    } catch (error) {
      console.error("Failed to initialize Plaid Link:", error)
      toast.error("Failed to initialize bank connection")
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleConnect} disabled={loading || !isConfigured}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      Connect Bank Account
    </Button>
  )
}

// Load Plaid Link script
function loadPlaidScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("plaid-link-script")) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.id = "plaid-link-script"
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Plaid script"))
    document.head.appendChild(script)
  })
}

// Plaid Link types
interface PlaidLinkFactory {
  create: (config: PlaidLinkConfig) => PlaidLinkHandler
}

interface PlaidLinkConfig {
  token: string
  onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void
  onExit: (err: PlaidLinkError | null, metadata?: PlaidLinkMetadata) => void
}

interface PlaidLinkHandler {
  open: () => void
  exit: () => void
}

interface PlaidLinkMetadata {
  institution: {
    institution_id: string
    name: string
  } | null
  accounts: Array<{
    id: string
    name: string
    mask: string | null
    type: string
    subtype: string | null
  }>
  link_session_id: string
  transfer_status?: string
}

interface PlaidLinkError {
  error_type: string
  error_code: string
  error_message: string
  display_message: string | null
}
