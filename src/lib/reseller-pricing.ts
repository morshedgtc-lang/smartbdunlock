export interface ServiceLike {
  id: string
  status: string
  clientVisible: boolean | null
  sellingPrice: number
}

export interface OverrideLike {
  serviceId: string
  price: number | null
  enabled: boolean
}

export type PricingResolution =
  | { ok: true; price: number }
  | { ok: false }

/**
 * Reseller pricing rule:
 * - No overrides at all  → full catalog at the standard selling price (backward compatible).
 * - Overrides exist      → ONLY enabled overrides are purchasable; price = override price ?? selling price.
 */
export function resolveEffectivePrice(
  service: ServiceLike,
  overrides: OverrideLike[],
): PricingResolution {
  if (!service || service.status !== 'active' || service.clientVisible !== true) {
    return { ok: false }
  }

  if (overrides.length > 0) {
    const override = overrides.find((o) => o.serviceId === service.id)
    if (!override) return { ok: false }
    if (!override.enabled) return { ok: false }
    return { ok: true, price: override.price ?? service.sellingPrice }
  }

  return { ok: true, price: service.sellingPrice }
}