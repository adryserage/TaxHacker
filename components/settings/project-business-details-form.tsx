"use client"

import { saveProjectBusinessAction } from "@/app/(app)/settings/actions"
import { FormError } from "@/components/forms/error"
import { FormAvatar, FormInput, FormSelect, FormTextarea } from "@/components/forms/simple"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  getProvinceOptions,
  getTaxRate,
  isValidProvinceCode,
  type ProvinceCode,
} from "@/lib/canadian-taxes"
import { Project } from "@/prisma/client"
import { CircleCheckBig, Info } from "lucide-react"
import { useActionState, useState } from "react"

const provinceItems = getProvinceOptions().map((p) => ({
  code: p.value,
  name: `${p.label} (${p.taxRate}%)`,
}))

const currencyItems = [
  { code: "CAD", name: "CAD - Canadian Dollar" },
  { code: "USD", name: "USD - US Dollar" },
]

export default function ProjectBusinessDetailsForm({ project }: { project: Project }) {
  const [saveState, saveAction, pending] = useActionState(saveProjectBusinessAction, null)
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>(
    project.province ?? undefined
  )

  const isQuebec = selectedProvince === "QC"
  const taxRate = selectedProvince && isValidProvinceCode(selectedProvince)
    ? getTaxRate(selectedProvince as ProvinceCode)
    : null

  return (
    <div className="w-full max-w-2xl">
      <form action={saveAction} className="space-y-6">
        <input type="hidden" name="code" value={project.code} />

        {/* Business Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Business Information</h3>

          <FormInput
            title="Company Name"
            name="businessName"
            placeholder="Your Company Inc."
            defaultValue={project.businessName ?? ""}
          />

          <FormTextarea
            title="Business Address"
            name="businessAddress"
            placeholder="123 Main Street, Suite 100&#10;Toronto, ON M5V 1A1&#10;Canada"
            defaultValue={project.businessAddress ?? ""}
          />

          <FormTextarea
            title="Head Office Address"
            name="headOfficeAddress"
            placeholder="Same as business address or different location"
            defaultValue={project.headOfficeAddress ?? ""}
          />

          <FormTextarea
            title="Billing Address"
            name="billingAddress"
            placeholder="Address for invoices and billing"
            defaultValue={project.billingAddress ?? ""}
          />

          <FormTextarea
            title="Bank Details"
            name="businessBankDetails"
            placeholder="Bank Name, Account Number, Transit Number, Institution Number"
            defaultValue={project.businessBankDetails ?? ""}
          />

          <FormAvatar
            title="Business Logo"
            name="businessLogo"
            className="w-32 h-32"
            defaultValue={project.businessLogo ?? ""}
          />
        </div>

        <Separator />

        {/* Canadian Tax Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tax Configuration</h3>

          <FormSelect
            title="Province / Territory"
            name="province"
            items={provinceItems}
            placeholder="Select province"
            defaultValue={project.province ?? undefined}
            onValueChange={setSelectedProvince}
            emptyValue="Not set"
          />

          {taxRate !== null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <Info className="h-4 w-4" />
              <span>
                Combined tax rate for this province: <strong>{taxRate}%</strong>
              </span>
            </div>
          )}

          <FormInput
            title="GST/HST Number"
            name="taxNumber"
            placeholder="123456789RT0001"
            defaultValue={project.taxNumber ?? ""}
          />

          {isQuebec && (
            <FormInput
              title="QST Number (Quebec)"
              name="provinceQstNumber"
              placeholder="1234567890TQ0001"
              defaultValue={project.provinceQstNumber ?? ""}
            />
          )}
        </div>

        <Separator />

        {/* Financial Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Financial Settings</h3>

          <FormSelect
            title="Default Currency"
            name="defaultCurrency"
            items={currencyItems}
            placeholder="Select currency"
            defaultValue={project.defaultCurrency ?? "CAD"}
          />

          <FormInput
            title="Fiscal Year Start"
            name="fiscalYearStart"
            placeholder="MM-DD (e.g., 01-01 for January 1st)"
            defaultValue={project.fiscalYearStart ?? ""}
          />
        </div>

        <Separator />

        <div className="flex flex-row items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Business Details"}
          </Button>
          {saveState?.success && (
            <p className="text-green-500 flex flex-row items-center gap-2">
              <CircleCheckBig className="h-4 w-4" />
              Saved!
            </p>
          )}
        </div>

        {saveState?.error && <FormError>{saveState.error}</FormError>}
      </form>
    </div>
  )
}
