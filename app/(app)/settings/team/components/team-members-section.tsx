"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getRoleOptions, ROLE_DISPLAY_NAMES, TeamRole } from "@/lib/rbac"
import { Project } from "@/prisma/client"
import { TeamMemberWithUser } from "@/models/team"
import { Loader2, Trash2, Users } from "lucide-react"
import { useState } from "react"
import { removeTeamMemberAction, updateTeamMemberAction } from "../actions"

interface TeamMembersSectionProps {
  teamMembers: TeamMemberWithUser[]
  projects: Project[]
}

export function TeamMembersSection({ teamMembers, projects }: TeamMembersSectionProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const roleOptions = getRoleOptions()

  const handleRoleChange = async (memberId: string, role: string) => {
    setLoadingId(memberId)
    await updateTeamMemberAction(memberId, { role })
    setLoadingId(null)
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return
    setLoadingId(memberId)
    await removeTeamMemberAction(memberId)
    setLoadingId(null)
  }

  const getProjectNames = (projectCodes: unknown) => {
    if (!projectCodes || !Array.isArray(projectCodes)) return null
    return projectCodes
      .map((code) => {
        const project = projects.find((p) => p.code === code)
        return project?.businessName || project?.name || code
      })
      .join(", ")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
        </CardTitle>
        <CardDescription>
          People who have access to your account data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No team members yet. Invite someone above.
          </p>
        ) : (
          <div className="space-y-4">
            {teamMembers.map((tm) => (
              <div
                key={tm.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={tm.member.avatar || undefined} />
                    <AvatarFallback>
                      {tm.member.name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{tm.member.name}</p>
                    <p className="text-sm text-muted-foreground">{tm.member.email}</p>
                    {tm.projectCodes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Projects: {getProjectNames(tm.projectCodes)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={tm.status === "active" ? "default" : "secondary"}
                  >
                    {tm.status}
                  </Badge>

                  {tm.status === "active" ? (
                    <Select
                      value={tm.role}
                      onValueChange={(role) => handleRoleChange(tm.memberId, role)}
                      disabled={loadingId === tm.memberId}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {ROLE_DISPLAY_NAMES[tm.role as TeamRole] || tm.role}
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(tm.memberId)}
                    disabled={loadingId === tm.memberId}
                  >
                    {loadingId === tm.memberId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
