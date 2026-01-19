import { getCurrentUser } from "@/lib/auth"
import { getProjects } from "@/models/projects"
import { TaxReportView } from "./components/tax-report-view"
import { manifest } from "./manifest"

export default async function TaxReportPage() {
  const user = await getCurrentUser()
  const projects = await getProjects(user.id)

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h2 className="flex flex-row gap-3 md:gap-5">
          <span className="text-3xl font-bold tracking-tight">
            {manifest.icon} {manifest.name}
          </span>
        </h2>
      </header>
      <TaxReportView userId={user.id} projects={projects} />
    </div>
  )
}
