import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Building2, AlertCircle } from "lucide-react"
import { getBankAccounts, checkPlaidConfigured } from "./actions"
import { BankAccountsList } from "./components/bank-accounts-list"
import { ConnectBankButton } from "./components/connect-bank-button"

export default async function BankAccountsSettingsPage() {
  const [accounts, isConfigured] = await Promise.all([
    getBankAccounts(),
    checkPlaidConfigured(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bank Accounts</h2>
        <p className="text-muted-foreground">
          Connect your bank accounts to automatically import transactions
        </p>
      </div>

      {!isConfigured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Plaid Not Configured</AlertTitle>
          <AlertDescription>
            To enable bank connections, set the following environment variables:
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>PLAID_CLIENT_ID</li>
              <li>PLAID_SECRET</li>
              <li>PLAID_ENV (sandbox, development, or production)</li>
            </ul>
            <p className="mt-2">
              Get your credentials at{" "}
              <a
                href="https://dashboard.plaid.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                dashboard.plaid.com
              </a>
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>
                  {accounts.length === 0
                    ? "No accounts connected yet"
                    : `${accounts.length} account${accounts.length === 1 ? "" : "s"} connected`}
                </CardDescription>
              </div>
            </div>
            <ConnectBankButton isConfigured={isConfigured} />
          </div>
        </CardHeader>
        <CardContent>
          <BankAccountsList accounts={accounts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ol className="space-y-2">
            <li>
              <strong>Connect your bank</strong> - Click the button above to securely link your bank
              account through Plaid
            </li>
            <li>
              <strong>Select accounts</strong> - Choose which checking, savings, or credit card
              accounts to connect
            </li>
            <li>
              <strong>Import transactions</strong> - Once connected, you can import transactions from
              your bank statements
            </li>
            <li>
              <strong>Automatic sync</strong> - Transactions are fetched automatically when you visit
              the bank statements page
            </li>
          </ol>

          <h4 className="font-medium mt-4">Security</h4>
          <p className="text-sm text-muted-foreground">
            Bank connections are powered by Plaid, a trusted financial services provider. Your bank
            credentials are never stored on our servers. You can revoke access at any time.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
