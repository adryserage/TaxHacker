"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Building2, CreditCard, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { disconnectBankAccount, toggleBankAccount } from "../actions"
import { formatDistanceToNow } from "date-fns"

type BankAccount = {
  id: string
  institutionName: string | null
  accountName: string
  accountType: string
  accountSubtype: string | null
  accountMask: string | null
  currencyCode: string
  isActive: boolean
  lastSyncedAt: Date | null
  errorMessage: string | null
  createdAt: Date
}

interface BankAccountsListProps {
  accounts: BankAccount[]
}

export function BankAccountsList({ accounts: initialAccounts }: BankAccountsListProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggle = async (id: string, isActive: boolean) => {
    setLoading(id)
    try {
      const result = await toggleBankAccount(id, isActive)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setAccounts(accounts.map(a => a.id === id ? { ...a, isActive } : a))
        toast.success(isActive ? "Account enabled" : "Account disabled")
      }
    } catch {
      toast.error("Failed to update account")
    } finally {
      setLoading(null)
    }
  }

  const handleDisconnect = async (id: string) => {
    setLoading(id)
    try {
      const result = await disconnectBankAccount(id)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setAccounts(accounts.filter(a => a.id !== id))
        toast.success("Bank account disconnected")
      }
    } catch {
      toast.error("Failed to disconnect account")
    } finally {
      setLoading(null)
    }
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No bank accounts connected</p>
          <p className="text-sm mt-1">Connect a bank account to import transactions automatically</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <Card key={account.id} className={!account.isActive ? "opacity-60" : ""}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{account.accountName}</h3>
                    {account.accountMask && (
                      <span className="text-muted-foreground text-sm">
                        ****{account.accountMask}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {account.institutionName && (
                      <Badge variant="secondary">{account.institutionName}</Badge>
                    )}
                    <Badge variant="outline">{account.accountType}</Badge>
                    {account.accountSubtype && (
                      <Badge variant="outline">{account.accountSubtype}</Badge>
                    )}
                    <Badge variant="outline">{account.currencyCode}</Badge>
                  </div>
                  {account.errorMessage && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {account.errorMessage}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {account.lastSyncedAt
                      ? `Last synced ${formatDistanceToNow(new Date(account.lastSyncedAt), { addSuffix: true })}`
                      : `Connected ${formatDistanceToNow(new Date(account.createdAt), { addSuffix: true })}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {account.isActive ? "Active" : "Disabled"}
                  </span>
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={(checked: boolean) => handleToggle(account.id, checked)}
                    disabled={loading === account.id}
                  />
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={loading === account.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Bank Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the connection to {account.accountName}
                        {account.institutionName ? ` at ${account.institutionName}` : ""}.
                        Previously imported transactions will not be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDisconnect(account.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
