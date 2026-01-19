import { prisma } from "@/lib/db"
import { isValidRole, TeamRole } from "@/lib/rbac"
import { TeamMember, User } from "@/prisma/client"
import { cache } from "react"

/**
 * Parse projectCodes (handles both JSON string for SQLite and array for PostgreSQL)
 */
function parseProjectCodes(projectCodes: unknown): string[] | null {
  if (!projectCodes) return null
  if (Array.isArray(projectCodes)) return projectCodes as string[]
  if (typeof projectCodes === "string") {
    try {
      const parsed = JSON.parse(projectCodes)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

export type TeamMemberWithUser = TeamMember & {
  member: Pick<User, "id" | "email" | "name" | "avatar">
}

export type TeamMemberWithOwner = TeamMember & {
  owner: Pick<User, "id" | "email" | "name" | "avatar">
}

/**
 * Get all team members for an account owner
 */
export const getTeamMembers = cache(async (ownerId: string): Promise<TeamMemberWithUser[]> => {
  return prisma.teamMember.findMany({
    where: { ownerId },
    include: {
      member: {
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  })
})

/**
 * Get all accounts a user is a team member of
 */
export const getTeamMemberships = cache(async (memberId: string): Promise<TeamMemberWithOwner[]> => {
  return prisma.teamMember.findMany({
    where: {
      memberId,
      status: "active",
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { acceptedAt: "desc" },
  })
})

/**
 * Get a specific team membership
 */
export const getTeamMembership = cache(
  async (ownerId: string, memberId: string): Promise<TeamMember | null> => {
    return prisma.teamMember.findUnique({
      where: {
        ownerId_memberId: {
          ownerId,
          memberId,
        },
      },
    })
  }
)

/**
 * Get a user's role for a specific account
 * Returns "owner" if the user is the account owner
 * Returns the team member role if the user is a team member
 * Returns null if the user has no access
 */
export async function getUserRoleForAccount(
  userId: string,
  accountOwnerId: string
): Promise<TeamRole | null> {
  // User is the account owner
  if (userId === accountOwnerId) {
    return "owner"
  }

  // Check if user is a team member
  const membership = await prisma.teamMember.findUnique({
    where: {
      ownerId_memberId: {
        ownerId: accountOwnerId,
        memberId: userId,
      },
      status: "active",
    },
  })

  if (membership && isValidRole(membership.role)) {
    return membership.role
  }

  return null
}

/**
 * Check if a user has access to a specific project
 * If projectCodes is null, the user has access to all projects
 */
export async function hasProjectAccess(
  userId: string,
  accountOwnerId: string,
  projectCode: string
): Promise<boolean> {
  // User is the account owner
  if (userId === accountOwnerId) {
    return true
  }

  // Check team membership
  const membership = await prisma.teamMember.findUnique({
    where: {
      ownerId_memberId: {
        ownerId: accountOwnerId,
        memberId: userId,
      },
      status: "active",
    },
  })

  if (!membership) {
    return false
  }

  // Parse projectCodes (handles SQLite string or PostgreSQL array)
  const allowedProjects = parseProjectCodes(membership.projectCodes)

  // If projectCodes is null, user has access to all projects
  if (allowedProjects === null) {
    return true
  }

  // Check if project is in the allowed list
  return allowedProjects.includes(projectCode)
}

/**
 * Invite a user to a team
 */
export async function inviteTeamMember(
  ownerId: string,
  memberEmail: string,
  role: TeamRole,
  projectCodes?: string[]
): Promise<{ success: boolean; error?: string; teamMember?: TeamMember }> {
  // Find the user by email
  const member = await prisma.user.findUnique({
    where: { email: memberEmail },
  })

  if (!member) {
    return { success: false, error: "User not found. They must create an account first." }
  }

  if (member.id === ownerId) {
    return { success: false, error: "You cannot invite yourself." }
  }

  // Check if already a team member
  const existing = await prisma.teamMember.findUnique({
    where: {
      ownerId_memberId: {
        ownerId,
        memberId: member.id,
      },
    },
  })

  if (existing) {
    if (existing.status === "active") {
      return { success: false, error: "User is already a team member." }
    }
    // Reactivate if revoked
    if (existing.status === "revoked") {
      const updated = await prisma.teamMember.update({
        where: { id: existing.id },
        data: {
          status: "pending",
          role,
          projectCodes: (projectCodes ?? null) as never,
          invitedAt: new Date(),
          acceptedAt: null,
        },
      })
      return { success: true, teamMember: updated }
    }
  }

  // Create new team member
  const teamMember = await prisma.teamMember.create({
    data: {
      ownerId,
      memberId: member.id,
      role,
      projectCodes: (projectCodes ?? null) as never,
      status: "pending",
    },
  })

  return { success: true, teamMember }
}

/**
 * Accept a team invitation
 */
export async function acceptTeamInvitation(
  memberId: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      ownerId_memberId: {
        ownerId,
        memberId,
      },
    },
  })

  if (!membership) {
    return { success: false, error: "Invitation not found." }
  }

  if (membership.status !== "pending") {
    return { success: false, error: "Invitation is no longer pending." }
  }

  await prisma.teamMember.update({
    where: { id: membership.id },
    data: {
      status: "active",
      acceptedAt: new Date(),
    },
  })

  return { success: true }
}

/**
 * Decline a team invitation
 */
export async function declineTeamInvitation(
  memberId: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      ownerId_memberId: {
        ownerId,
        memberId,
      },
    },
  })

  if (!membership) {
    return { success: false, error: "Invitation not found." }
  }

  await prisma.teamMember.delete({
    where: { id: membership.id },
  })

  return { success: true }
}

/**
 * Update a team member's role or project access
 */
export async function updateTeamMember(
  ownerId: string,
  memberId: string,
  updates: { role?: TeamRole; projectCodes?: string[] | null }
): Promise<{ success: boolean; error?: string }> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      ownerId_memberId: {
        ownerId,
        memberId,
      },
    },
  })

  if (!membership) {
    return { success: false, error: "Team member not found." }
  }

  // Use 'as never' to handle both PostgreSQL (Json type) and SQLite (String type)
  const projectCodesValue = updates.projectCodes !== undefined
    ? updates.projectCodes
    : parseProjectCodes(membership.projectCodes)

  await prisma.teamMember.update({
    where: { id: membership.id },
    data: {
      role: updates.role ?? membership.role,
      projectCodes: projectCodesValue as never,
    },
  })

  return { success: true }
}

/**
 * Remove a team member (revoke access)
 */
export async function removeTeamMember(
  ownerId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      ownerId_memberId: {
        ownerId,
        memberId,
      },
    },
  })

  if (!membership) {
    return { success: false, error: "Team member not found." }
  }

  await prisma.teamMember.update({
    where: { id: membership.id },
    data: {
      status: "revoked",
    },
  })

  return { success: true }
}

/**
 * Leave a team (as a member)
 */
export async function leaveTeam(
  memberId: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      ownerId_memberId: {
        ownerId,
        memberId,
      },
    },
  })

  if (!membership) {
    return { success: false, error: "You are not a member of this team." }
  }

  await prisma.teamMember.delete({
    where: { id: membership.id },
  })

  return { success: true }
}

/**
 * Get pending invitations for a user
 */
export const getPendingInvitations = cache(async (memberId: string): Promise<TeamMemberWithOwner[]> => {
  return prisma.teamMember.findMany({
    where: {
      memberId,
      status: "pending",
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  })
})
