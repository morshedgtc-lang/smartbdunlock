import type { SupplierAdapter, SupplierResponse, SupplierStatus } from './base'

export class MockSupplierAdapter implements SupplierAdapter {
  name = 'Mock Supplier'
  type = 'mock'

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
