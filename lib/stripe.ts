import Stripe from "stripe"
import config from "./config"

export const stripeClient: Stripe | null = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, {
      apiVersion: "2025-03-31.basil",
    })
  : null

export type Plan = {
  code: string
  name: string
  description: string
  benefits: string[]
  price: string
  stripePriceId: string
  limits: {
    storage: number
    ai: number
    projects: number // -1 = unlimited
  }
  isAvailable: boolean
}

export const PLANS: Record<string, Plan> = {
  // Legacy plans
  unlimited: {
    code: "unlimited",
    name: "Unlimited",
    description: "Special unlimited plan",
    benefits: ["Unlimited storage", "Unlimited AI analysis", "Unlimited everything"],
    price: "",
    stripePriceId: "",
    limits: {
      storage: -1,
      ai: -1,
      projects: -1,
    },
    isAvailable: false,
  },
  early: {
    code: "early",
    name: "Early Adopter",
    description: "Discounted plan for our first users who can forgive us bugs and childish problems :)",
    benefits: [
      "Special price for early adopters",
      "512 Mb of storage",
      "1000 AI file analyses",
      "Unlimited transactions",
      "Unlimited fields, categories and projects",
    ],
    price: "€35 for a year",
    stripePriceId: "price_1RHTj1As8DS4NhOzhejpTN3I",
    limits: {
      storage: 512 * 1024 * 1024,
      ai: 1000,
      projects: -1,
    },
    isAvailable: true,
  },

  // Canadian SaaS Plans
  starter_monthly: {
    code: "starter_monthly",
    name: "Starter",
    description: "Perfect for freelancers and sole proprietors",
    benefits: [
      "Up to 3 companies",
      "1 GB storage",
      "500 AI document analyses/month",
      "Canadian tax calculations",
      "Invoice generation",
      "Email support",
    ],
    price: "$15 CAD/month",
    stripePriceId: "", // TODO: Create Stripe price and add ID
    limits: {
      storage: 1 * 1024 * 1024 * 1024, // 1 GB
      ai: 500,
      projects: 3,
    },
    isAvailable: false, // Enable when Stripe price is created
  },
  starter_yearly: {
    code: "starter_yearly",
    name: "Starter (Annual)",
    description: "Perfect for freelancers and sole proprietors - save 2 months!",
    benefits: [
      "Up to 3 companies",
      "1 GB storage",
      "500 AI document analyses/month",
      "Canadian tax calculations",
      "Invoice generation",
      "Email support",
      "2 months free",
    ],
    price: "$150 CAD/year",
    stripePriceId: "", // TODO: Create Stripe price and add ID
    limits: {
      storage: 1 * 1024 * 1024 * 1024, // 1 GB
      ai: 500,
      projects: 3,
    },
    isAvailable: false, // Enable when Stripe price is created
  },
  professional_monthly: {
    code: "professional_monthly",
    name: "Professional",
    description: "For growing businesses with multiple companies",
    benefits: [
      "Unlimited companies",
      "10 GB storage",
      "2000 AI document analyses/month",
      "Canadian tax calculations",
      "Invoice generation",
      "GST/HST/QST reports",
      "Priority support",
      "Data export",
    ],
    price: "$49 CAD/month",
    stripePriceId: "", // TODO: Create Stripe price and add ID
    limits: {
      storage: 10 * 1024 * 1024 * 1024, // 10 GB
      ai: 2000,
      projects: -1, // Unlimited
    },
    isAvailable: false, // Enable when Stripe price is created
  },
  professional_yearly: {
    code: "professional_yearly",
    name: "Professional (Annual)",
    description: "For growing businesses with multiple companies - save 2 months!",
    benefits: [
      "Unlimited companies",
      "10 GB storage",
      "2000 AI document analyses/month",
      "Canadian tax calculations",
      "Invoice generation",
      "GST/HST/QST reports",
      "Priority support",
      "Data export",
      "2 months free",
    ],
    price: "$490 CAD/year",
    stripePriceId: "", // TODO: Create Stripe price and add ID
    limits: {
      storage: 10 * 1024 * 1024 * 1024, // 10 GB
      ai: 2000,
      projects: -1, // Unlimited
    },
    isAvailable: false, // Enable when Stripe price is created
  },
}

/**
 * Get available plans for display
 */
export function getAvailablePlans(): Plan[] {
  return Object.values(PLANS).filter((plan) => plan.isAvailable)
}

/**
 * Get a plan by code
 */
export function getPlanByCode(code: string): Plan | undefined {
  return PLANS[code]
}

/**
 * Check if a user has reached their project limit
 */
export function hasReachedProjectLimit(
  currentProjectCount: number,
  planCode: string
): boolean {
  const plan = getPlanByCode(planCode)
  if (!plan) return false
  if (plan.limits.projects === -1) return false
  return currentProjectCount >= plan.limits.projects
}
