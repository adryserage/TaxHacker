"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ROLE_DISPLAY_NAMES, TeamRole } from "@/lib/rbac"
import { TeamMemberWithOwner } from "@/models/team"
import { Building2, Loader2, LogOut } from "lucide-react"
import { useState } from "react"
import { leaveTeamAction } from "../actions"

interface TeamMembershipsSectionProps {
  memberships: TeamMemberWithOwner[]
}

export function TeamMembershipsSection({ memberships }: TeamMembershipsSectionProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleLeave = async (ownerId: string) => {
    if (!confirm("Are you sure you want to leave this team? You will lose access to their data.")) {
      return
    }
    setLoadingId(ownerId)
    await leaveTeamAction(ownerId)
    setLoadingId(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Accounts I Have Access To
        </CardTitle>
        <CardDescription>
          Other accounts that have granted you access to their data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {memberships.map((membership) => (
            <div
              key={membership.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={membership.owner.avatar || undefined} />
                  <AvatarFallback>
                    {membership.owner.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{membership.owner.name}</p>
                  <p className="text-sm text-muted-foreground">{membership.owner.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {ROLE_DISPLAY_NAMES[membership.role as TeamRole] || membership.role}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLeave(membership.ownerId)}
                  disabled={loadingId === membership.ownerId}
                >
                  {loadingId === membership.ownerId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
