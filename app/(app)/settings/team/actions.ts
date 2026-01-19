"use server"

import { getCurrentUser } from "@/lib/auth"
import { isValidRole, TeamRole } from "@/lib/rbac"
import {
  acceptTeamInvitation,
  declineTeamInvitation,
  getPendingInvitations,
  getTeamMemberships,
  getTeamMembers,
  inviteTeamMember,
  leaveTeam,
  removeTeamMember,
  updateTeamMember,
} from "@/models/team"
import { revalidatePath } from "next/cache"

export async function getTeamMembersAction() {
  const user = await getCurrentUser()
  return getTeamMembers(user.id)
}

export async function getTeamMembershipsAction() {
  const user = await getCurrentUser()
  return getTeamMemberships(user.id)
}

export async function getPendingInvitationsAction() {
  const user = await getCurrentUser()
  return getPendingInvitations(user.id)
}

export async function inviteTeamMemberAction(
  email: string,
  role: string,
  projectCodes?: string[]
) {
  const user = await getCurrentUser()

  if (!isValidRole(role)) {
    return { success: false, error: "Invalid role specified." }
  }

  const result = await inviteTeamMember(user.id, email, role as TeamRole, projectCodes)

  if (result.success) {
    revalidatePath("/settings/team")
  }

  return result
}

export async function acceptInvitationAction(ownerId: string) {
  const user = await getCurrentUser()
  const result = await acceptTeamInvitation(user.id, ownerId)

  if (result.success) {
    revalidatePath("/settings/team")
  }

  return result
}

export async function declineInvitationAction(ownerId: string) {
  const user = await getCurrentUser()
  const result = await declineTeamInvitation(user.id, ownerId)

  if (result.success) {
    revalidatePath("/settings/team")
  }

  return result
}

export async function updateTeamMemberAction(
  memberId: string,
  updates: { role?: string; projectCodes?: string[] | null }
) {
  const user = await getCurrentUser()

  if (updates.role && !isValidRole(updates.role)) {
    return { success: false, error: "Invalid role specified." }
  }

  const result = await updateTeamMember(user.id, memberId, {
    role: updates.role as TeamRole | undefined,
    projectCodes: updates.projectCodes,
  })

  if (result.success) {
    revalidatePath("/settings/team")
  }

  return result
}

export async function removeTeamMemberAction(memberId: string) {
  const user = await getCurrentUser()
  const result = await removeTeamMember(user.id, memberId)

  if (result.success) {
    revalidatePath("/settings/team")
  }

  return result
}

export async function leaveTeamAction(ownerId: string) {
  const user = await getCurrentUser()
  const result = await leaveTeam(user.id, ownerId)

  if (result.success) {
    revalidatePath("/settings/team")
  }

  return result
}
