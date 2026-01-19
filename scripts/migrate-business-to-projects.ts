/**
 * Migration Script: User Business Details -> Project Business Details
 *
 * This script migrates business information from the User model to Project model.
 * For users with existing projects, it copies business details to their first/primary project.
 * For users without projects, it creates a "default-company" project with their business details.
 *
 * Usage:
 *   DRY_RUN=true bunx tsx scripts/migrate-business-to-projects.ts  # Preview changes
 *   bunx tsx scripts/migrate-business-to-projects.ts                # Execute migration
 */

import { PrismaClient } from "@/prisma/client"

const prisma = new PrismaClient()
const DRY_RUN = process.env.DRY_RUN === "true"

interface MigrationResult {
  userId: string
  userEmail: string
  action: "migrated_to_existing" | "created_default_project" | "skipped"
  projectCode?: string
  details: string
}

async function migrateBusinessToProjects() {
  console.log("=".repeat(60))
  console.log("Migration: User Business Details -> Project Business Details")
  console.log("=".repeat(60))
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes will be made)" : "LIVE MIGRATION"}`)
  console.log("")

  const results: MigrationResult[] = []

  // Get all users with business details
  const usersWithBusiness = await prisma.user.findMany({
    where: {
      OR: [
        { businessName: { not: null } },
        { businessAddress: { not: null } },
        { businessBankDetails: { not: null } },
        { businessLogo: { not: null } },
      ],
    },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  console.log(`Found ${usersWithBusiness.length} users with business details to migrate`)
  console.log("")

  for (const user of usersWithBusiness) {
    const hasBusinessData =
      user.businessName || user.businessAddress || user.businessBankDetails || user.businessLogo

    if (!hasBusinessData) {
      results.push({
        userId: user.id,
        userEmail: user.email,
        action: "skipped",
        details: "No business data to migrate",
      })
      continue
    }

    if (user.projects.length > 0) {
      // User has existing projects - migrate to the first one
      const targetProject = user.projects[0]

      // Check if project already has business details
      if (targetProject.businessName) {
        results.push({
          userId: user.id,
          userEmail: user.email,
          action: "skipped",
          projectCode: targetProject.code,
          details: `Project "${targetProject.name}" already has business details`,
        })
        continue
      }

      if (!DRY_RUN) {
        await prisma.project.update({
          where: { id: targetProject.id },
          data: {
            businessName: user.businessName,
            businessAddress: user.businessAddress,
            businessBankDetails: user.businessBankDetails,
            businessLogo: user.businessLogo,
          },
        })
      }

      results.push({
        userId: user.id,
        userEmail: user.email,
        action: "migrated_to_existing",
        projectCode: targetProject.code,
        details: `Migrated to project "${targetProject.name}"`,
      })
    } else {
      // User has no projects - create a default one
      const defaultProjectCode = "default-company"
      const defaultProjectName = user.businessName || "My Company"

      if (!DRY_RUN) {
        await prisma.project.create({
          data: {
            code: defaultProjectCode,
            name: defaultProjectName,
            color: "#3B82F6", // Blue
            userId: user.id,
            businessName: user.businessName,
            businessAddress: user.businessAddress,
            businessBankDetails: user.businessBankDetails,
            businessLogo: user.businessLogo,
            defaultCurrency: "CAD",
          },
        })
      }

      results.push({
        userId: user.id,
        userEmail: user.email,
        action: "created_default_project",
        projectCode: defaultProjectCode,
        details: `Created new project "${defaultProjectName}"`,
      })
    }
  }

  // Print results
  console.log("Migration Results:")
  console.log("-".repeat(60))

  const migratedToExisting = results.filter((r) => r.action === "migrated_to_existing")
  const createdDefault = results.filter((r) => r.action === "created_default_project")
  const skipped = results.filter((r) => r.action === "skipped")

  console.log(`\nMigrated to existing projects: ${migratedToExisting.length}`)
  for (const r of migratedToExisting) {
    console.log(`  - ${r.userEmail}: ${r.details}`)
  }

  console.log(`\nCreated default projects: ${createdDefault.length}`)
  for (const r of createdDefault) {
    console.log(`  - ${r.userEmail}: ${r.details}`)
  }

  console.log(`\nSkipped: ${skipped.length}`)
  for (const r of skipped) {
    console.log(`  - ${r.userEmail}: ${r.details}`)
  }

  console.log("")
  console.log("=".repeat(60))
  console.log(`Total processed: ${results.length}`)
  console.log(`  - Migrated: ${migratedToExisting.length}`)
  console.log(`  - Created: ${createdDefault.length}`)
  console.log(`  - Skipped: ${skipped.length}`)

  if (DRY_RUN) {
    console.log("")
    console.log("This was a DRY RUN. No changes were made.")
    console.log("Run without DRY_RUN=true to execute the migration.")
  }

  console.log("=".repeat(60))

  return results
}

// Main execution
migrateBusinessToProjects()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
