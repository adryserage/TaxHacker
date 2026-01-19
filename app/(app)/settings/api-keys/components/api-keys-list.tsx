"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Project } from "@/prisma/client"
import { ApiKeyWithoutHash, API_SCOPES, ApiScope } from "@/models/api-keys"
import { revokeApiKeyAction, deleteApiKeyAction } from "../actions"
import { Loader2, Trash2, Ban, Clock, Activity } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ApiKeysListProps {
  apiKeys: ApiKeyWithoutHash[]
  projects: Project[]
}

export function ApiKeysList({ apiKeys, projects }: ApiKeysListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleRevoke = async (id: string) => {
    setLoadingId(id)
    await revokeApiKeyAction(id)
    setLoadingId(null)
  }

  const handleDelete = async (id: string) => {
    setLoadingId(id)
    await deleteApiKeyAction(id)
    setLoadingId(null)
  }

  const getProjectNames = (codes: unknown) => {
    if (!codes || !Array.isArray(codes)) return null
    return codes
      .map((code) => {
        const project = projects.find((p) => p.code === code)
        return project?.businessName || project?.name || code
      })
      .join(", ")
  }

  if (apiKeys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No API keys yet. Create one above to get started.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {apiKeys.map((key) => (
        <div
          key={key.id}
          className={`p-4 border rounded-lg space-y-3 ${
            !key.isActive ? "bg-muted/50 opacity-60" : ""
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{key.name}</h4>
                {!key.isActive && (
                  <Badge variant="secondary">Revoked</Badge>
                )}
                {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                  <Badge variant="destructive">Expired</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {key.keyPrefix}...
              </p>
            </div>
            <div className="flex gap-2">
              {key.isActive && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingId === key.id}
                    >
                      {loadingId === key.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Ban className="h-4 w-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will immediately disable the API key. Any integrations
                        using this key will stop working.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRevoke(key.id)}>
                        Revoke
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={loadingId === key.id}
                  >
                    {loadingId === key.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the API key. This action cannot
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(key.id)}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {(key.scopes as ApiScope[]).map((scope) => (
              <Badge key={scope} variant="outline" className="text-xs">
                {API_SCOPES[scope] || scope}
              </Badge>
            ))}
          </div>

          {key.projectCodes && (
            <p className="text-xs text-muted-foreground">
              Projects: {getProjectNames(key.projectCodes)}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
            </span>
            {key.lastUsedAt && (
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Last used {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
              </span>
            )}
            <span>
              {key.usageCount.toLocaleString()} request{key.usageCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
