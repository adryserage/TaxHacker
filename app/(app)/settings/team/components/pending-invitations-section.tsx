"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ROLE_DISPLAY_NAMES, TeamRole } from "@/lib/rbac"
import { TeamMemberWithOwner } from "@/models/team"
import { Bell, Check, Loader2, X } from "lucide-react"
import { useState } from "react"
import { acceptInvitationAction, declineInvitationAction } from "../actions"

interface PendingInvitationsSectionProps {
  invitations: TeamMemberWithOwner[]
}

export function PendingInvitationsSection({ invitations }: PendingInvitationsSectionProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleAccept = async (ownerId: string) => {
    setLoadingId(ownerId)
    await acceptInvitationAction(ownerId)
    setLoadingId(null)
  }

  const handleDecline = async (ownerId: string) => {
    setLoadingId(ownerId)
    await declineInvitationAction(ownerId)
    setLoadingId(null)
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-yellow-600" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          You have been invited to access these accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-4 bg-white border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={invitation.owner.avatar || undefined} />
                  <AvatarFallback>
                    {invitation.owner.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{invitation.owner.name}</p>
                  <p className="text-sm text-muted-foreground">{invitation.owner.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {ROLE_DISPLAY_NAMES[invitation.role as TeamRole] || invitation.role}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invitation.ownerId)}
                    disabled={loadingId === invitation.ownerId}
                  >
                    {loadingId === invitation.ownerId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecline(invitation.ownerId)}
                    disabled={loadingId === invitation.ownerId}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
