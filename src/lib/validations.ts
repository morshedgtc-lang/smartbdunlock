import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').refine(
    (e) => e.endsWith('@gmail.com'),
    'Only Gmail addresses are accepted'
  ),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
})

export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export const ordersQuerySchema = z.object({
  search: z.string().optional().default(''),
  status: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
})

export const createOrderSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  imei: z.string().optional(),
  deviceInfo: z.string().optional(),
  notes: z.string().optional(),
  customFieldValues: z.record(z.string(), z.unknown()).optional().default({}),
})

export const updateOrderSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'rejected', 'refunded']).optional(),
  notes: z.string().optional(),
  result: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional().nullable(),
  internalNotes: z.string().optional(),
})

export const servicesQuerySchema = z.object({
  search: z.string().optional().default(''),
  type: z.string().optional().default(''),
  status: z.string().optional().default(''),
  categoryId: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(500).optional().default(500),
})

const customFieldInputSchema = z.object({
  fieldType: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  options: z.unknown().optional(),
  required: z.boolean().optional(),
  visibleToClient: z.boolean().optional(),
  previewImage: z.boolean().optional(),
  order: z.number().int().optional(),
})

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Type is required'),
  cost: z.number().min(0).optional().default(0),
  sellingPrice: z.number().min(0).optional().default(0),
  processingTime: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  clientVisible: z.boolean().optional().default(true),
  categoryId: z.string().optional(),
  customFields: z.array(customFieldInputSchema).optional(),
})

export const updateServiceSchema = z.object({
  id: z.string().min(1, 'Service ID is required'),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.string().min(1).optional(),
  cost: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  processingTime: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  clientVisible: z.boolean().optional(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  customFields: z.array(customFieldInputSchema).optional(),
})

export const usersQuerySchema = z.object({
  search: z.string().optional().default(''),
  role: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(500),
})

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'reseller']).optional().default('reseller'),
  resellerId: z.string().optional(),
})

export const updateUserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['admin', 'reseller']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  resellerId: z.string().optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

export const walletPostSchema = z.object({
  type: z.enum(['deposit', 'withdraw', 'transfer'], 'Invalid transaction type'),
  amount: z.number().positive('Amount must be a positive number'),
  description: z.string().optional(),
  targetUserId: z.string().optional(),
})

export const suppliersQuerySchema = z.object({
  search: z.string().optional().default(''),
  status: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(500).optional().default(500),
})

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  apiKey: z.string().optional().nullable(),
  config: z.string().optional().nullable(),
  priority: z.number().int().min(1).optional().default(1),
})

export const updateSupplierSchema = z.object({
  id: z.string().min(1, 'Supplier ID is required'),
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  apiKey: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  syncInterval: z.number().int().min(1).max(1440).optional(),
  config: z.string().optional().nullable(),
  priority: z.number().int().min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const categoriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(200),
})

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').transform(v => v.trim()),
})

export const updateCategorySchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Category name is required').transform(v => v.trim()),
})

export const logsQuerySchema = z.object({
  level: z.string().optional().default(''),
  source: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
})

export const createLogSchema = z.object({
  level: z.enum(['info', 'warn', 'error', 'debug']).optional().default('info'),
  message: z.string().min(1, 'Message is required'),
  source: z.string().optional().default('manual'),
  details: z.unknown().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const depositRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['bkash', 'nagad', 'usdt', 'bank'], 'Invalid payment method'),
  transactionId: z.string().optional(),
  screenshot: z.string().optional(),
})

export const depositRequestQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export const depositRequestUpdateSchema = z.object({
  id: z.string().min(1, 'Request ID is required'),
  status: z.enum(['approved', 'rejected'], 'Status must be approved or rejected'),
  adminNote: z.string().optional(),
})

export const bulkOrderProcessSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  imeis: z.array(z.string().min(15, 'IMEI must be 15 digits').max(15, 'IMEI must be 15 digits')).min(1, 'At least one IMEI required'),
})

export const bulkOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export const providerQuerySchema = z.object({
  search: z.string().optional().default(''),
  status: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(500).optional().default(500),
})

export const createProviderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  apiUrl: z.string().url('Invalid URL').optional().nullable(),
  apiKey: z.string().min(1, 'API key is required'),
  ipAddress: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  syncInterval: z.number().int().min(1).max(1440).optional().default(10),
  config: z.string().optional().nullable(),
  priority: z.number().int().min(1).optional().default(1),
})

export const updateProviderSchema = z.object({
  id: z.string().min(1, 'Provider ID is required'),
  name: z.string().min(1).optional(),
  apiUrl: z.string().url().optional().nullable(),
  apiKey: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  syncInterval: z.number().int().min(1).max(1440).optional(),
  config: z.string().optional().nullable(),
  priority: z.number().int().min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const supplierServiceQuerySchema = z.object({
  providerId: z.string().optional().default(''),
  status: z.string().optional().default(''),
  search: z.string().optional().default(''),
  category: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
})

export const approveServiceSchema = z.object({
  id: z.string().min(1, 'Service ID is required'),
  sellingPrice: z.number().min(0).optional(),
  profitType: z.enum(['fixed', 'percentage']).optional().default('fixed'),
  profitValue: z.number().min(0).optional().default(0),
  categoryId: z.string().optional().nullable(),
  clientVisible: z.boolean().optional().default(true),
})

export const bulkServiceActionSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one service required'),
  action: z.enum(['approve', 'ignore', 'disable']),
})

export const pricingRuleQuerySchema = z.object({
  type: z.string().optional().default(''),
  category: z.string().optional().default(''),
  providerId: z.string().optional().default(''),
  active: z.coerce.boolean().optional(),
})

export const createPricingRuleSchema = z.object({
  type: z.enum(['fixed', 'percentage', 'category', 'supplier'], 'Invalid rule type'),
  value: z.number().min(0, 'Value must be non-negative'),
  category: z.string().optional().nullable(),
  providerId: z.string().optional().nullable(),
  currency: z.string().optional().default('USD'),
  active: z.boolean().optional().default(true),
})

export const updatePricingRuleSchema = z.object({
  id: z.string().min(1, 'Rule ID is required'),
  value: z.number().min(0).optional(),
  category: z.string().optional().nullable(),
  providerId: z.string().optional().nullable(),
  currency: z.string().optional(),
  active: z.boolean().optional(),
})

export const syncHistoryQuerySchema = z.object({
  providerId: z.string().optional().default(''),
  status: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export function validateBody<T extends z.ZodType>(schema: T, data: unknown) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.issues.map(i => i.message)
    return { success: false as const, error: errors[0] }
  }
  return { success: true as const, data: result.data }
}

export function validateQuery<T extends z.ZodType>(schema: T, searchParams: URLSearchParams) {
  const obj: Record<string, string> = {}
  searchParams.forEach((v, k) => { obj[k] = v })
  return validateBody(schema, obj)
}
