export interface SupplierServiceData {
  serviceId: string
  name: string
  category?: string
  cost: number
  currency?: string
  deliveryTime?: string
  requiredInputs?: string[]
  rawData?: Record<string, unknown>
}

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
  connect(apiUrl: string, apiKey: string): Promise<boolean>
  testConnection(apiUrl: string, apiKey: string): Promise<{ success: boolean; message: string; latencyMs?: number }>
  getServices(apiUrl: string, apiKey: string): Promise<SupplierServiceData[]>
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
