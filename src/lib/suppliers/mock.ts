import type { SupplierAdapter, SupplierResponse, SupplierStatus, SupplierServiceData } from './base'

export class MockSupplierAdapter implements SupplierAdapter {
  name = 'Mock Supplier'
  type = 'mock'

  async connect(): Promise<boolean> {
    return true
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now()
    await new Promise(r => setTimeout(r, 50))
    return { success: true, message: 'Mock connection OK', latencyMs: Date.now() - start }
  }

  async getServices(): Promise<SupplierServiceData[]> {
    return [
      {
        serviceId: 'MOCK-001',
        name: 'iPhone FMI OFF',
        category: 'Apple',
        cost: 15,
        currency: 'USD',
        deliveryTime: '24-48h',
        requiredInputs: ['imei'],
      },
      {
        serviceId: 'MOCK-002',
        name: 'Samsung FRP Unlock',
        category: 'Samsung',
        cost: 5,
        currency: 'USD',
        deliveryTime: '1-24h',
        requiredInputs: ['imei'],
      },
    ]
  }

  async submitOrder(params: {
    orderId: string
    orderNumber: string
    imei?: string
    deviceInfo?: string
    serviceType: string
  }): Promise<SupplierResponse> {
    await new Promise(r => setTimeout(r, 100))
    const externalOrderId = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return {
      success: true,
      externalOrderId,
      message: `Order ${params.orderNumber} submitted to mock supplier`,
      rawResponse: JSON.stringify({ externalOrderId, status: 'received', orderNumber: params.orderNumber }),
    }
  }

  async checkStatus(externalOrderId: string): Promise<SupplierStatus> {
    await new Promise(r => setTimeout(r, 50))
    return {
      status: 'completed',
      result: JSON.stringify({ externalOrderId, status: 'completed' }),
      message: 'Mock order completed',
    }
  }

  async cancelOrder(): Promise<boolean> {
    return true
  }
}
