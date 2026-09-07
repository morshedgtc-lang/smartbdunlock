import { describe, it, expect } from 'vitest'
import { resolveEffectivePrice } from '../src/lib/reseller-pricing'

const activeService = {
  id: 'svc-1',
  status: 'active',
  clientVisible: true,
  sellingPrice: 10,
}

describe('resolveEffectivePrice', () => {
  it('returns selling price when there are no overrides (backward compatible)', () => {
    expect(resolveEffectivePrice(activeService, [])).toEqual({ ok: true, price: 10 })
  })

  it('rejects inactive or hidden services', () => {
    expect(resolveEffectivePrice({ ...activeService, status: 'inactive' }, [])).toEqual({ ok: false })
    expect(resolveEffectivePrice({ ...activeService, clientVisible: false }, [])).toEqual({ ok: false })
  })

  it('rejects a service with no override when overrides exist (catalog scoping)', () => {
    const overrides = [{ serviceId: 'svc-other', price: null, enabled: true }]
    expect(resolveEffectivePrice(activeService, overrides)).toEqual({ ok: false })
  })

  it('rejects a disabled override', () => {
    const overrides = [{ serviceId: 'svc-1', price: 8, enabled: false }]
    expect(resolveEffectivePrice(activeService, overrides)).toEqual({ ok: false })
  })

  it('uses the override price when set', () => {
    const overrides = [{ serviceId: 'svc-1', price: 8, enabled: true }]
    expect(resolveEffectivePrice(activeService, overrides)).toEqual({ ok: true, price: 8 })
  })

  it('falls back to selling price when override price is null', () => {
    const overrides = [{ serviceId: 'svc-1', price: null, enabled: true }]
    expect(resolveEffectivePrice(activeService, overrides)).toEqual({ ok: true, price: 10 })
  })

  it('is unaffected by overrides for other services when this service has its own override', () => {
    const overrides = [
      { serviceId: 'svc-other', price: null, enabled: true },
      { serviceId: 'svc-1', price: 12, enabled: true },
    ]
    expect(resolveEffectivePrice(activeService, overrides)).toEqual({ ok: true, price: 12 })
  })
})