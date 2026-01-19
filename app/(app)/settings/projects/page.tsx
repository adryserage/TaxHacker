import { addProjectAction, deleteProjectAction, editProjectAction } from "@/app/(app)/settings/actions"
import { CrudTable } from "@/components/settings/crud"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { randomHexColor } from "@/lib/utils"
import { getProjects } from "@/models/projects"
import { Prisma } from "@/prisma/client"
import { Building2 } from "lucide-react"
import Link from "next/link"

export default async function ProjectsSettingsPage() {
  const user = await getCurrentUser()
  const projects = await getProjects(user.id)
  const projectsWithActions = projects.map((project) => ({
    ...project,
    isEditable: true,
    isDeletable: true,
  }))

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-2">Projects</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-prose">
        Projects represent your companies or business activities. Each project can have its own
        business details, tax configuration, and financial settings.
      </p>

      {/* Quick links to project business details */}
      {projects.length > 0 && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-medium mb-3">Configure Business Details</h3>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <Link key={project.code} href={`/settings/projects/${project.code}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  {project.name}
                  {project.province && (
                    <span className="text-muted-foreground">({project.province})</span>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      <CrudTable
        items={projectsWithActions}
        columns={[
          { key: "name", label: "Name", editable: true },
          { key: "llm_prompt", label: "LLM Prompt", editable: true },
          { key: "color", label: "Color", type: "color", defaultValue: randomHexColor(), editable: true },
        ]}
        onDelete={async (code) => {
          "use server"
          return await deleteProjectAction(user.id, code)
        }}
        onAdd={async (data) => {
          "use server"
          return await addProjectAction(user.id, data as Prisma.ProjectCreateInput)
        }}
        onEdit={async (code, data) => {
          "use server"
          return await editProjectAction(user.id, code, data as Prisma.ProjectUpdateInput)
        }}
      />
    </div>
  )
}
