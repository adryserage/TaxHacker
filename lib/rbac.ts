/**
 * Role-Based Access Control (RBAC) utilities
 *
 * Roles:
 * - owner: Full access including team management
 * - accountant: Can view/edit transactions, create invoices, view reports
 * - viewer: Read-only access to transactions and reports
 */

export type TeamRole = "owner" | "accountant" | "viewer"

export type Permission =
  | "team:manage"           // Invite/remove team members
  | "team:view"             // View team members
  | "transactions:create"   // Create transactions
  | "transactions:edit"     // Edit transactions
  | "transactions:delete"   // Delete transactions
  | "transactions:view"     // View transactions
  | "invoices:create"       // Create invoices
  | "invoices:edit"         // Edit invoices
  | "invoices:view"         // View invoices
  | "reports:view"          // View reports
  | "reports:export"        // Export data
  | "settings:edit"         // Edit settings
  | "settings:view"         // View settings
  | "projects:create"       // Create projects
  | "projects:edit"         // Edit projects
  | "projects:delete"       // Delete projects
  | "projects:view"         // View projects
  | "files:upload"          // Upload files
  | "files:delete"          // Delete files
  | "files:view"            // View files

/**
 * Role permission mappings
 */
export const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [
    "team:manage",
    "team:view",
    "transactions:create",
    "transactions:edit",
    "transactions:delete",
    "transactions:view",
    "invoices:create",
    "invoices:edit",
    "invoices:view",
    "reports:view",
    "reports:export",
    "settings:edit",
    "settings:view",
    "projects:create",
    "projects:edit",
    "projects:delete",
    "projects:view",
    "files:upload",
    "files:delete",
    "files:view",
  ],
  accountant: [
    "team:view",
    "transactions:create",
    "transactions:edit",
    "transactions:view",
    "invoices:create",
    "invoices:edit",
    "invoices:view",
    "reports:view",
    "reports:export",
    "settings:view",
    "projects:view",
    "files:upload",
    "files:view",
  ],
  viewer: [
    "team:view",
    "transactions:view",
    "invoices:view",
    "reports:view",
    "settings:view",
    "projects:view",
    "files:view",
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: TeamRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: TeamRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: TeamRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Validate if a string is a valid role
 */
export function isValidRole(role: string): role is TeamRole {
  return role === "owner" || role === "accountant" || role === "viewer"
}

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<TeamRole, string> = {
  owner: "Owner",
  accountant: "Accountant",
  viewer: "Viewer",
}

/**
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Full access including team management, settings, and all data",
  accountant: "Can create and edit transactions, invoices, and view reports",
  viewer: "Read-only access to transactions, invoices, and reports",
}

/**
 * Get role options for select dropdowns
 */
export function getRoleOptions(): Array<{ value: TeamRole; label: string; description: string }> {
  return (["owner", "accountant", "viewer"] as TeamRole[]).map((role) => ({
    value: role,
    label: ROLE_DISPLAY_NAMES[role],
    description: ROLE_DESCRIPTIONS[role],
  }))
}
