import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
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
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
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
