import { getCurrentUser } from "@/lib/auth"
import { getPendingInvitations, getTeamMemberships, getTeamMembers } from "@/models/team"
import { getProjects } from "@/models/projects"
import { TeamMembersSection } from "./components/team-members-section"
import { TeamMembershipsSection } from "./components/team-memberships-section"
import { PendingInvitationsSection } from "./components/pending-invitations-section"
import { InviteTeamMemberForm } from "./components/invite-team-member-form"

export default async function TeamSettingsPage() {
  const user = await getCurrentUser()
  const [teamMembers, teamMemberships, pendingInvitations, projects] = await Promise.all([
    getTeamMembers(user.id),
    getTeamMemberships(user.id),
    getPendingInvitations(user.id),
    getProjects(user.id),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Team Management</h3>
        <p className="text-sm text-muted-foreground">
          Invite team members to access your account data with different permission levels.
        </p>
      </div>

      {/* Pending Invitations (for the current user) */}
      {pendingInvitations.length > 0 && (
        <PendingInvitationsSection invitations={pendingInvitations} />
      )}

      {/* Invite New Team Member */}
      <InviteTeamMemberForm projects={projects} />

      {/* Current Team Members */}
      <TeamMembersSection teamMembers={teamMembers} projects={projects} />

      {/* Accounts I'm a Member Of */}
      {teamMemberships.length > 0 && (
        <TeamMembershipsSection memberships={teamMemberships} />
      )}
    </div>
  )
}
