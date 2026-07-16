export interface SupplierResponse {
  success: boolean
  externalOrderId?: string
  message?: string
  rawResponse?: string
}

export interface SupplierStatus {
  status: 'processing' | 'completed' | 'failed'
  result?: string
  message?: string
}

export interface SupplierAdapter {
  name: string
  type: string
  submitOrder(params: {
    orderId: string
    orderNumber: string
    imei?: string
    deviceInfo?: string
    serviceType: string
    payload?: string
  }): Promise<SupplierResponse>
  checkStatus(externalOrderId: string): Promise<SupplierStatus>
  cancelOrder(externalOrderId: string): Promise<boolean>
}
