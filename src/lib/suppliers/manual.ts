import type { SupplierAdapter, SupplierResponse, SupplierStatus, SupplierServiceData } from './base'

export class ManualSupplierAdapter implements SupplierAdapter {
  name = 'Manual Supplier'
  type = 'manual'

  async connect(): Promise<boolean> {
    return true
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Manual supplier — no API to test' }
  }

  async getServices(): Promise<SupplierServiceData[]> {
    return []
  }

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
