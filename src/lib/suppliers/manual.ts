import type { SupplierAdapter, SupplierResponse, SupplierStatus } from './base'

export class ManualSupplierAdapter implements SupplierAdapter {
  name = 'Manual Supplier'
  type = 'manual'

  async submitOrder(params: {
    orderId: string
    orderNumber: string
  }): Promise<SupplierResponse> {
    return {
      success: true,
      message: `Order ${params.orderNumber} queued for manual processing`,
      rawResponse: JSON.stringify({ mode: 'manual', orderId: params.orderId }),
    }
  }

  async checkStatus(): Promise<SupplierStatus> {
    return { status: 'processing', message: 'Manual processing - awaiting admin action' }
  }

  async cancelOrder(): Promise<boolean> {
    return true
  }
}
