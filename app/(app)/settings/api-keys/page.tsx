import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getApiKeys } from "@/models/api-keys"
import { getProjects } from "@/models/projects"
import { CreateApiKeyForm } from "./components/create-api-key-form"
import { ApiKeysList } from "./components/api-keys-list"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Key, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function ApiKeysSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    redirect("/login")
  }

  const [apiKeys, projects] = await Promise.all([
    getApiKeys(session.user.id),
    getProjects(session.user.id),
  ])

  return (
    <div className="flex-1 lg:max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Manage API keys for programmatic access to your data.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Keep your API keys secure</AlertTitle>
        <AlertDescription>
          API keys provide full access to your account data based on their scopes.
          Never share them publicly or commit them to version control.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Create API Key
          </CardTitle>
          <CardDescription>
            Create a new API key with specific permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateApiKeyForm projects={projects} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            {apiKeys.length === 0
              ? "You haven't created any API keys yet."
              : `You have ${apiKeys.length} API key${apiKeys.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeysList apiKeys={apiKeys} projects={projects} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Quick reference for using the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Authentication</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in the Authorization header:
            </p>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
              {`Authorization: Bearer th_live_xxxxxxxxxxxx`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Endpoints</h4>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded">GET</code>
                <code>/api/v1/transactions</code>
                <span className="text-muted-foreground">- List transactions</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded">POST</code>
                <code>/api/v1/transactions</code>
                <span className="text-muted-foreground">- Create transaction</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded">GET</code>
                <code>/api/v1/transactions/:id</code>
                <span className="text-muted-foreground">- Get transaction</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded">PUT</code>
                <code>/api/v1/transactions/:id</code>
                <span className="text-muted-foreground">- Update transaction</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded">DELETE</code>
                <code>/api/v1/transactions/:id</code>
                <span className="text-muted-foreground">- Delete transaction</span>
              </div>
              <div className="flex gap-2 mt-4">
                <code className="bg-muted px-2 py-1 rounded">GET</code>
                <code>/api/v1/projects</code>
                <span className="text-muted-foreground">- List projects</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded">POST</code>
                <code>/api/v1/projects</code>
                <span className="text-muted-foreground">- Create project</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded">GET</code>
                <code>/api/v1/projects/:code</code>
                <span className="text-muted-foreground">- Get project</span>
              </div>
              <div className="flex gap-2">
                <code className="bg-muted px-2 py-1 rounded">PUT</code>
                <code>/api/v1/projects/:code</code>
                <span className="text-muted-foreground">- Update project</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Query Parameters</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><code className="bg-muted px-1 rounded">page</code> - Page number (default: 1)</p>
              <p><code className="bg-muted px-1 rounded">limit</code> - Items per page (max: 100)</p>
              <p><code className="bg-muted px-1 rounded">project</code> - Filter by project code</p>
              <p><code className="bg-muted px-1 rounded">from</code> - Start date (ISO format)</p>
              <p><code className="bg-muted px-1 rounded">to</code> - End date (ISO format)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
