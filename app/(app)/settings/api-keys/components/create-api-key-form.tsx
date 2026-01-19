"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Project } from "@/prisma/client"
import { API_SCOPES, ApiScope } from "@/models/api-keys"
import { createApiKeyAction } from "../actions"
import { Loader2, Copy, Check, Key } from "lucide-react"

interface CreateApiKeyFormProps {
  projects: Project[]
}

export function CreateApiKeyForm({ projects }: CreateApiKeyFormProps) {
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<ApiScope[]>(["transactions:read", "projects:read"])
  const [projectRestriction, setProjectRestriction] = useState<"all" | "specific">("all")
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleScopeToggle = (scope: ApiScope) => {
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    )
  }

  const handleProjectToggle = (code: string) => {
    setSelectedProjects((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return
    if (scopes.length === 0) return

    setIsLoading(true)

    const result = await createApiKeyAction(
      name.trim(),
      scopes,
      projectRestriction === "specific" ? selectedProjects : undefined
    )

    setIsLoading(false)

    if (result.success && result.key) {
      setNewKey(result.key)
      setName("")
      setScopes(["transactions:read", "projects:read"])
      setProjectRestriction("all")
      setSelectedProjects([])
    }
  }

  const copyToClipboard = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const closeDialog = () => {
    setNewKey(null)
    setCopied(false)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Key Name</Label>
          <Input
            id="name"
            placeholder="e.g., Production Integration"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            A descriptive name to help you identify this key.
          </p>
        </div>

        <div className="space-y-3">
          <Label>Permissions</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.entries(API_SCOPES) as [ApiScope, string][]).map(([scope, description]) => (
              <div key={scope} className="flex items-center space-x-2">
                <Checkbox
                  id={scope}
                  checked={scopes.includes(scope)}
                  onCheckedChange={() => handleScopeToggle(scope)}
                />
                <Label htmlFor={scope} className="text-sm font-normal cursor-pointer">
                  {description}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Project Access</Label>
          <Select
            value={projectRestriction}
            onValueChange={(v) => setProjectRestriction(v as "all" | "specific")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="specific">Specific projects only</SelectItem>
            </SelectContent>
          </Select>

          {projectRestriction === "specific" && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects available.</p>
              ) : (
                projects.map((project) => (
                  <div key={project.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={`project-${project.code}`}
                      checked={selectedProjects.includes(project.code)}
                      onCheckedChange={() => handleProjectToggle(project.code)}
                    />
                    <Label
                      htmlFor={`project-${project.code}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {project.businessName || project.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || !name.trim() || scopes.length === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 mr-2" />
              Create API Key
            </>
          )}
        </Button>
      </form>

      <Dialog open={!!newKey} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-3 rounded-md text-sm font-mono break-all">
                {newKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Store this key securely. For security reasons, we only show it once.
            </p>
            <Button onClick={closeDialog} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
