import { CANADIAN_PROVINCES, isValidProvinceCode, type ProvinceCode } from "@/lib/canadian-taxes"
import { SettingsMap } from "@/models/settings"
import { Project, User } from "@/prisma/client"
import { addDays, format } from "date-fns"
import { AdditionalTax, InvoiceFormData } from "./components/invoice-page"

export interface InvoiceTemplate {
  id?: string
  name: string
  formData: InvoiceFormData
}

/**
 * Get default taxes based on province configuration
 */
function getDefaultTaxesForProvince(province: string | null): AdditionalTax[] {
  if (!province || !isValidProvinceCode(province)) {
    return [{ name: "Tax", rate: 0, amount: 0 }]
  }

  const config = CANADIAN_PROVINCES[province as ProvinceCode]
  const taxes: AdditionalTax[] = []

  switch (config.taxType) {
    case "HST":
      taxes.push({ name: "HST", rate: config.hstRate!, amount: 0 })
      break
    case "GST+PST":
      taxes.push({ name: "GST", rate: config.gstRate!, amount: 0 })
      if (config.pstRate! > 0) {
        taxes.push({ name: "PST", rate: config.pstRate!, amount: 0 })
      }
      break
    case "GST+QST":
      taxes.push({ name: "GST/TPS", rate: config.gstRate!, amount: 0 })
      taxes.push({ name: "QST/TVQ", rate: config.qstRate!, amount: 0 })
      break
    case "GST_ONLY":
      taxes.push({ name: "GST", rate: config.gstRate!, amount: 0 })
      break
  }

  return taxes
}

export default function defaultTemplates(user: User, settings: SettingsMap, projects: Project[]): InvoiceTemplate[] {
  // Find the first project with province configured, or use the first project
  const defaultProject = projects.find((p) => p.province) || projects[0]

  // Use project business details if available, fallback to user business details
  const businessName = defaultProject?.businessName || user.businessName || ""
  const businessAddress = defaultProject?.businessAddress || user.businessAddress || ""
  const businessLogo = defaultProject?.businessLogo || user.businessLogo
  const businessBankDetails = defaultProject?.businessBankDetails || user.businessBankDetails || ""
  const defaultCurrency = defaultProject?.defaultCurrency || settings.default_currency || "CAD"
  const defaultTaxes = getDefaultTaxesForProvince(defaultProject?.province || null)

  const defaultTemplate: InvoiceFormData = {
    title: "INVOICE",
    businessLogo: businessLogo,
    invoiceNumber: "",
    date: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    currency: defaultCurrency,
    companyDetails: `${businessName}\n${businessAddress}`,
    companyDetailsLabel: "Bill From",
    billTo: "",
    billToLabel: "Bill To",
    items: [{ name: "", subtitle: "", showSubtitle: false, quantity: 1, unitPrice: 0, subtotal: 0 }],
    taxIncluded: false,
    additionalTaxes: defaultTaxes,
    additionalFees: [],
    notes: "",
    bankDetails: businessBankDetails,
    issueDateLabel: "Issue Date",
    dueDateLabel: "Due Date",
    itemLabel: "Item",
    quantityLabel: "Quantity",
    unitPriceLabel: "Unit Price",
    subtotalLabel: "Subtotal",
    summarySubtotalLabel: "Subtotal:",
    summaryTotalLabel: "Total:",
    projectCode: defaultProject?.code || null,
  }

  // Canadian French template (Quebec)
  const canadianFrenchTemplate: InvoiceFormData = {
    title: "FACTURE",
    businessLogo: businessLogo,
    invoiceNumber: "",
    date: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    currency: "CAD",
    companyDetails: `${businessName}\n${businessAddress}`,
    companyDetailsLabel: "De",
    billTo: "",
    billToLabel: "Facturer à",
    items: [{ name: "", subtitle: "", showSubtitle: false, quantity: 1, unitPrice: 0, subtotal: 0 }],
    taxIncluded: false,
    additionalTaxes: [
      { name: "TPS", rate: 5, amount: 0 },
      { name: "TVQ", rate: 9.975, amount: 0 },
    ],
    additionalFees: [],
    notes: "",
    bankDetails: businessBankDetails,
    issueDateLabel: "Date de facture",
    dueDateLabel: "Date d'échéance",
    itemLabel: "Article",
    quantityLabel: "Qté",
    unitPriceLabel: "Prix unitaire",
    subtotalLabel: "Sous-total",
    summarySubtotalLabel: "Sous-total:",
    summaryTotalLabel: "Total:",
    projectCode: defaultProject?.code || null,
  }

  const germanTemplate: InvoiceFormData = {
    title: "RECHNUNG",
    businessLogo: user.businessLogo,
    invoiceNumber: "",
    date: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    currency: "EUR",
    companyDetails: `${user.businessName}\n${user.businessAddress || ""}`,
    companyDetailsLabel: "Rechnungssteller",
    billTo: "",
    billToLabel: "Rechnungsempfänger",
    items: [{ name: "", subtitle: "", showSubtitle: false, quantity: 1, unitPrice: 0, subtotal: 0 }],
    taxIncluded: true,
    additionalTaxes: [{ name: "MwSt", rate: 19, amount: 0 }],
    additionalFees: [],
    notes: "",
    bankDetails: user.businessBankDetails || "",
    issueDateLabel: "Rechnungsdatum",
    dueDateLabel: "Fälligkeitsdatum",
    itemLabel: "Position",
    quantityLabel: "Menge",
    unitPriceLabel: "Einzelpreis",
    subtotalLabel: "Zwischensumme",
    summarySubtotalLabel: "Zwischensumme:",
    summaryTotalLabel: "Gesamtbetrag:",
    projectCode: null,
  }

  return [
    { name: "Default", formData: defaultTemplate },
    { name: "Français (QC)", formData: canadianFrenchTemplate },
    { name: "DE", formData: germanTemplate },
  ]
}
