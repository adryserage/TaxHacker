"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getRoleOptions } from "@/lib/rbac"
import { Project } from "@/prisma/client"
import { Loader2, UserPlus } from "lucide-react"
import { useState } from "react"
import { inviteTeamMemberAction } from "../actions"

interface InviteTeamMemberFormProps {
  projects: Project[]
}

export function InviteTeamMemberForm({ projects }: InviteTeamMemberFormProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("viewer")
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [restrictProjects, setRestrictProjects] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const roleOptions = getRoleOptions()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const projectCodes = restrictProjects && selectedProjects.length > 0 ? selectedProjects : undefined

    const result = await inviteTeamMemberAction(email, role, projectCodes)

    if (result.success) {
      setSuccess(`Invitation sent to ${email}`)
      setEmail("")
      setRole("viewer")
      setSelectedProjects([])
      setRestrictProjects(false)
    } else {
      setError(result.error || "Failed to send invitation")
    }

    setIsLoading(false)
  }

  const toggleProject = (code: string) => {
    setSelectedProjects((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite Team Member
        </CardTitle>
        <CardDescription>
          Send an invitation to a user to access your account data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {projects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="restrictProjects"
                  checked={restrictProjects}
                  onChange={(e) => setRestrictProjects(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="restrictProjects" className="font-normal">
                  Restrict access to specific projects
                </Label>
              </div>

              {restrictProjects && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {projects.map((project) => (
                    <label
                      key={project.code}
                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
                        selectedProjects.includes(project.code)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(project.code)}
                        onChange={() => toggleProject(project.code)}
                        className="rounded"
                      />
                      <span className="text-sm">{project.businessName || project.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
