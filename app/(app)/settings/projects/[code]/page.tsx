import ProjectBusinessDetailsForm from "@/components/settings/project-business-details-form"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getProjectByCode } from "@/models/projects"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface ProjectBusinessDetailsPageProps {
  params: Promise<{ code: string }>
}

export default async function ProjectBusinessDetailsPage({
  params,
}: ProjectBusinessDetailsPageProps) {
  const { code } = await params
  const user = await getCurrentUser()
  const project = await getProjectByCode(user.id, code)

  if (!project) {
    notFound()
  }

  return (
    <div className="container max-w-2xl">
      <div className="mb-6">
        <Link href="/settings/projects">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {project.name}
          <span className="ml-2 text-muted-foreground font-normal text-lg">
            Business Details
          </span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-prose">
          Configure business information, tax settings, and financial preferences for this company.
          These details will be used for invoices and tax calculations.
        </p>
      </div>

      <ProjectBusinessDetailsForm project={project} />
    </div>
  )
}
