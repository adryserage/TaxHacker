/**
 * Canadian Provincial Tax Configuration
 *
 * Tax Types:
 * - HST (Harmonized Sales Tax): Combined federal + provincial in one rate
 * - GST+PST: Separate federal GST (5%) + Provincial Sales Tax
 * - GST+QST: Quebec's system - QST calculated on GST-inclusive amount
 * - GST_ONLY: Only federal GST applies (no provincial sales tax)
 */

export type TaxType = "HST" | "GST+PST" | "GST+QST" | "GST_ONLY"

export type ProvinceCode =
  | "AB"
  | "BC"
  | "MB"
  | "NB"
  | "NL"
  | "NS"
  | "NT"
  | "NU"
  | "ON"
  | "PE"
  | "QC"
  | "SK"
  | "YT"

export interface ProvinceConfig {
  name: string
  nameFr: string
  gstRate: number | null // Federal GST rate (5% or null if HST)
  pstRate: number | null // Provincial Sales Tax rate
  hstRate: number | null // Harmonized Sales Tax rate (combines GST+PST)
  qstRate?: number // Quebec Sales Tax rate (9.975%)
  taxType: TaxType
}

export const CANADIAN_PROVINCES: Record<ProvinceCode, ProvinceConfig> = {
  AB: {
    name: "Alberta",
    nameFr: "Alberta",
    gstRate: 5,
    pstRate: 0,
    hstRate: null,
    taxType: "GST_ONLY",
  },
  BC: {
    name: "British Columbia",
    nameFr: "Colombie-Britannique",
    gstRate: 5,
    pstRate: 7,
    hstRate: null,
    taxType: "GST+PST",
  },
  MB: {
    name: "Manitoba",
    nameFr: "Manitoba",
    gstRate: 5,
    pstRate: 7,
    hstRate: null,
    taxType: "GST+PST",
  },
  NB: {
    name: "New Brunswick",
    nameFr: "Nouveau-Brunswick",
    gstRate: null,
    pstRate: null,
    hstRate: 15,
    taxType: "HST",
  },
  NL: {
    name: "Newfoundland and Labrador",
    nameFr: "Terre-Neuve-et-Labrador",
    gstRate: null,
    pstRate: null,
    hstRate: 15,
    taxType: "HST",
  },
  NS: {
    name: "Nova Scotia",
    nameFr: "Nouvelle-Écosse",
    gstRate: null,
    pstRate: null,
    hstRate: 15,
    taxType: "HST",
  },
  NT: {
    name: "Northwest Territories",
    nameFr: "Territoires du Nord-Ouest",
    gstRate: 5,
    pstRate: 0,
    hstRate: null,
    taxType: "GST_ONLY",
  },
  NU: {
    name: "Nunavut",
    nameFr: "Nunavut",
    gstRate: 5,
    pstRate: 0,
    hstRate: null,
    taxType: "GST_ONLY",
  },
  ON: {
    name: "Ontario",
    nameFr: "Ontario",
    gstRate: null,
    pstRate: null,
    hstRate: 13,
    taxType: "HST",
  },
  PE: {
    name: "Prince Edward Island",
    nameFr: "Île-du-Prince-Édouard",
    gstRate: null,
    pstRate: null,
    hstRate: 15,
    taxType: "HST",
  },
  QC: {
    name: "Quebec",
    nameFr: "Québec",
    gstRate: 5,
    pstRate: null,
    hstRate: null,
    qstRate: 9.975,
    taxType: "GST+QST",
  },
  SK: {
    name: "Saskatchewan",
    nameFr: "Saskatchewan",
    gstRate: 5,
    pstRate: 6,
    hstRate: null,
    taxType: "GST+PST",
  },
  YT: {
    name: "Yukon",
    nameFr: "Yukon",
    gstRate: 5,
    pstRate: 0,
    hstRate: null,
    taxType: "GST_ONLY",
  },
} as const

export interface TaxBreakdown {
  subtotal: number // Amount before tax (in cents)
  gst: number // GST amount (in cents)
  pst: number // PST amount (in cents)
  qst: number // QST amount (in cents)
  hst: number // HST amount (in cents)
  total: number // Total including all taxes (in cents)
  taxType: TaxType
  effectiveRate: number // Combined tax rate as percentage
}

/**
 * Calculate taxes for a given amount and province
 *
 * Note: Quebec's QST is calculated on the GST-inclusive amount
 * All amounts are in cents to avoid floating point issues
 *
 * @param subtotalCents - Amount before tax in cents
 * @param province - Province code (e.g., "ON", "QC")
 * @returns Tax breakdown with all tax components
 */
export function calculateTaxes(
  subtotalCents: number,
  province: ProvinceCode
): TaxBreakdown {
  const config = CANADIAN_PROVINCES[province]

  let gst = 0
  let pst = 0
  let qst = 0
  let hst = 0

  switch (config.taxType) {
    case "HST":
      // Single harmonized tax
      hst = Math.round(subtotalCents * (config.hstRate! / 100))
      break

    case "GST+PST":
      // Separate federal and provincial taxes
      gst = Math.round(subtotalCents * (config.gstRate! / 100))
      pst = Math.round(subtotalCents * (config.pstRate! / 100))
      break

    case "GST+QST":
      // Quebec: QST is calculated on GST-inclusive amount
      gst = Math.round(subtotalCents * (config.gstRate! / 100))
      const gstInclusiveAmount = subtotalCents + gst
      qst = Math.round(gstInclusiveAmount * (config.qstRate! / 100))
      break

    case "GST_ONLY":
      // Only federal GST
      gst = Math.round(subtotalCents * (config.gstRate! / 100))
      break
  }

  const totalTax = gst + pst + qst + hst
  const total = subtotalCents + totalTax
  const effectiveRate = subtotalCents > 0 ? (totalTax / subtotalCents) * 100 : 0

  return {
    subtotal: subtotalCents,
    gst,
    pst,
    qst,
    hst,
    total,
    taxType: config.taxType,
    effectiveRate: Math.round(effectiveRate * 100) / 100, // Round to 2 decimals
  }
}

/**
 * Get the combined tax rate for a province as a percentage
 */
export function getTaxRate(province: ProvinceCode): number {
  const config = CANADIAN_PROVINCES[province]

  switch (config.taxType) {
    case "HST":
      return config.hstRate!
    case "GST+PST":
      return config.gstRate! + config.pstRate!
    case "GST+QST":
      // Effective rate for Quebec (GST + QST on GST-inclusive)
      // 5% + 9.975% of 105% = 5% + 10.47375% ≈ 14.975%
      return 14.975
    case "GST_ONLY":
      return config.gstRate!
    default:
      return 0
  }
}

/**
 * Get province configuration by code
 */
export function getProvince(code: string): ProvinceConfig | null {
  if (isValidProvinceCode(code)) {
    return CANADIAN_PROVINCES[code]
  }
  return null
}

/**
 * Check if a string is a valid province code
 */
export function isValidProvinceCode(code: string): code is ProvinceCode {
  return code in CANADIAN_PROVINCES
}

/**
 * Get all provinces as options for a select dropdown
 */
export function getProvinceOptions(locale: "en" | "fr" = "en") {
  return Object.entries(CANADIAN_PROVINCES).map(([code, config]) => ({
    value: code,
    label: locale === "fr" ? config.nameFr : config.name,
    taxType: config.taxType,
    taxRate: getTaxRate(code as ProvinceCode),
  }))
}

/**
 * Format tax breakdown for display
 */
export function formatTaxBreakdown(
  breakdown: TaxBreakdown,
  locale: "en" | "fr" = "en"
): string[] {
  const lines: string[] = []
  const formatAmount = (cents: number) =>
    (cents / 100).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency: "CAD",
    })

  lines.push(
    `${locale === "fr" ? "Sous-total" : "Subtotal"}: ${formatAmount(breakdown.subtotal)}`
  )

  if (breakdown.hst > 0) {
    lines.push(`HST (${CANADIAN_PROVINCES.ON.hstRate}%): ${formatAmount(breakdown.hst)}`)
  }
  if (breakdown.gst > 0) {
    lines.push(`GST/TPS (5%): ${formatAmount(breakdown.gst)}`)
  }
  if (breakdown.pst > 0) {
    lines.push(`PST/TVP: ${formatAmount(breakdown.pst)}`)
  }
  if (breakdown.qst > 0) {
    lines.push(`QST/TVQ (9.975%): ${formatAmount(breakdown.qst)}`)
  }

  lines.push(`${locale === "fr" ? "Total" : "Total"}: ${formatAmount(breakdown.total)}`)

  return lines
}

/**
 * Validate a Canadian GST/HST number format
 * Format: 9 digits followed by RT and 4 more digits (e.g., 123456789RT0001)
 */
export function isValidGstHstNumber(number: string): boolean {
  const cleaned = number.replace(/\s/g, "").toUpperCase()
  return /^\d{9}RT\d{4}$/.test(cleaned)
}

/**
 * Validate a Quebec QST number format
 * Format: 10 digits followed by TQ and 4 more digits (e.g., 1234567890TQ0001)
 */
export function isValidQstNumber(number: string): boolean {
  const cleaned = number.replace(/\s/g, "").toUpperCase()
  return /^\d{10}TQ\d{4}$/.test(cleaned)
}
