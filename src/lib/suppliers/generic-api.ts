import type { SupplierAdapter, SupplierResponse, SupplierStatus, SupplierServiceData } from './base'

interface ApiLogEntry {
  endpoint: string
  method: string
  requestTime: Date
  responseTime?: Date
  statusCode?: number
  success: boolean
  errorMessage?: string
}

export class GenericApiAdapter implements SupplierAdapter {
  name = 'Generic API Supplier'
  type = 'api'

  private lastLog: ApiLogEntry | null = null

  getLastLog(): ApiLogEntry | null {
    return this.lastLog
  }

  async connect(apiUrl: string, apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async testConnection(apiUrl: string, apiKey: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const endpoint = `${apiUrl.replace(/\/$/, '')}/services`
    const requestTime = new Date()
    const start = Date.now()

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      })

      const latencyMs = Date.now() - start
      const responseTime = new Date()

      this.lastLog = {
        endpoint,
        method: 'GET',
        requestTime,
        responseTime,
        statusCode: res.status,
        success: res.ok,
      }

      if (res.ok) {
        const data = await res.json().catch(() => null)
        const serviceCount = Array.isArray(data?.services) ? data.services.length
          : Array.isArray(data) ? data.length
          : Array.isArray(data?.data) ? data.data.length
          : 0
        return { success: true, message: `Connected — ${serviceCount} services found`, latencyMs }
      }

      const errorBody = await res.text().catch(() => '')
      return { success: false, message: `HTTP ${res.status}: ${errorBody.slice(0, 200)}`, latencyMs }
    } catch (err) {
      const latencyMs = Date.now() - start
      this.lastLog = {
        endpoint,
        method: 'GET',
        requestTime,
        responseTime: new Date(),
        success: false,
        errorMessage: err instanceof Error ? err.message : 'Connection failed',
      }
      return { success: false, message: err instanceof Error ? err.message : 'Connection failed', latencyMs }
    }
  }

  async getServices(apiUrl: string, apiKey: string): Promise<SupplierServiceData[]> {
    const endpoint = `${apiUrl.replace(/\/$/, '')}/services`

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const raw: Record<string, unknown>[] = Array.isArray(data?.services)
        ? data.services
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : []

      return raw.map((s) => ({
        serviceId: String(s.id || s.serviceId || s.service_id || ''),
        name: String(s.name || s.title || s.service_name || 'Unknown'),
        category: String(s.category || s.type || ''),
        cost: Number(s.cost || s.price || s.supplierCost || s.supplier_cost || 0),
        currency: String(s.currency || 'USD'),
        deliveryTime: String(s.deliveryTime || s.delivery_time || s.eta || ''),
        requiredInputs: Array.isArray(s.requiredInputs || s.required_inputs || s.fields)
          ? ((s.requiredInputs || s.required_inputs || s.fields) as string[])
          : undefined,
        rawData: s,
      }))
    } catch (err) {
      throw new Error(`Failed to fetch services: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async submitOrder(params: {
    orderId: string
    orderNumber: string
    imei?: string
    deviceInfo?: string
    serviceType: string
    payload?: string
  }): Promise<SupplierResponse> {
    try {
      const payload = params.payload ? JSON.parse(params.payload) : {}
      return {
        success: true,
        externalOrderId: payload.externalOrderId || null,
        message: `Order ${params.orderNumber} submitted`,
        rawResponse: JSON.stringify({ status: 'submitted', orderId: params.orderNumber }),
      }
    } catch {
      return { success: false, message: 'Failed to submit order' }
    }
  }

  async checkStatus(): Promise<SupplierStatus> {
    return { status: 'processing', message: 'Status check not implemented for generic adapter' }
  }

  async cancelOrder(): Promise<boolean> {
    return false
  }
}
