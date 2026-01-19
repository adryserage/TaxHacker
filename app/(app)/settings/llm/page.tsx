import LLMSettingsForm from "@/components/settings/llm-settings-form"
import { getCurrentUser } from "@/lib/auth"
import config from "@/lib/config"
import { getFields } from "@/models/fields"
import { getSettings } from "@/models/settings"
import { redirect } from "next/navigation"

export default async function LlmSettingsPage() {
  // Cloud mode users should not access LLM settings directly
  if (!config.selfHosted.isEnabled) {
    redirect("/settings")
  }

  const user = await getCurrentUser()
  const settings = await getSettings(user.id)
  const fields = await getFields(user.id)

  return (
    <>
      <div className="w-full max-w-2xl">
        <LLMSettingsForm settings={settings} fields={fields} showApiKey={config.selfHosted.isEnabled} />
      </div>
    </>
  )
}
