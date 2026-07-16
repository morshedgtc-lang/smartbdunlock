# SmartBD Unlock — Database Specification

**Database:** PostgreSQL | **ORM:** Prisma 5.22.0 | **Tables:** 15 | **PKs:** TEXT (cuid) | **Datetimes:** TIMESTAMP(3)

---

## Module Grouping

| Module | Tables |
|---|---|
| Auth & Users | `User` |
| Catalog | `ServiceCategory`, `Service`, `ServiceCustomField` |
| Suppliers | `Supplier` |
| Orders | `Order`, `OrderNote`, `OrderCustomFieldValue` |
| Finance | `Transaction` |
| Audit & Logs | `Log`, `AuditLog` |
| Notifications | `Notification` |
| API Access | `ApiKey` |

---

## Table 1: `User`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| email | TEXT | NO | — |
| password | TEXT | NO | — |
| name | TEXT | NO | — |
| role | TEXT | NO | `'reseller'` |
| phone | TEXT | YES | — |
| status | TEXT | NO | `'active'` |
| walletBalance | DOUBLE PRECISION | NO | `0` |
| resellerId | TEXT | YES | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |
| updatedAt | TIMESTAMP(3) | NO | — |

**Indexes:** PK(`id`), UNIQUE(`email`), BTREE(`email`), BTREE(`role`)

**FKs:**

| Column | References | ON DELETE | ON UPDATE |
|---|---|---|---|
| `resellerId` | `User(id)` | **SET NULL** | CASCADE |

**Self-Relation:** `resellerId` → parent User. **1:N** — one admin/reseller owns many clients. Nullable (admins have NULL). On parent deletion: clients orphaned (SET NULL).

**Reverse:** `clients` → User[], `orders` → Order[], `transactions` → Transaction[], `logs` → Log[]

---

## Table 2: `ServiceCategory`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| name | TEXT | NO | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |
| updatedAt | TIMESTAMP(3) | NO | — |

**Indexes:** PK(`id`), UNIQUE(`name`)

**FKs:** None

**Reverse:** `services` → Service[]

---

## Table 3: `Service`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| name | TEXT | NO | — |
| description | TEXT | YES | — |
| type | TEXT | NO | `'unlock'` |
| cost | DOUBLE PRECISION | NO | `0` |
| sellingPrice | DOUBLE PRECISION | NO | `0` |
| processingTime | TEXT | YES | — |
| status | TEXT | NO | `'active'` |
| clientVisible | BOOLEAN | NO | `true` |
| categoryId | TEXT | YES | — |
| supplierId | TEXT | YES | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |
| updatedAt | TIMESTAMP(3) | NO | — |

**Indexes:** PK(`id`), COMPOSITE BTREE(`supplierId`, `status`)

**FKs:**

| Column | References | ON DELETE | ON UPDATE |
|---|---|---|---|
| `categoryId` | `ServiceCategory(id)` | **SET NULL** | CASCADE |
| `supplierId` | `Supplier(id)` | **SET NULL** | CASCADE |

**Reverse:** `orders` → Order[], `customFields` → ServiceCustomField[]

---

## Table 4: `ServiceCustomField`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| serviceId | TEXT | NO | — |
| fieldType | TEXT | NO | — |
| label | TEXT | NO | — |
| placeholder | TEXT | YES | — |
| options | TEXT | YES | — |
| required | BOOLEAN | NO | `false` |
| visibleToClient | BOOLEAN | NO | `true` |
| order | INTEGER | NO | `0` |
| createdAt | TIMESTAMP(3) | NO | `now()` |
| updatedAt | TIMESTAMP(3) | NO | — |

**fieldType values:** `text`, `textarea`, `number`, `select`, `multiselect`, `checkbox`, `file`, `image`, `imei_single`, `imei_multi`, `serial_single`, `serial_multi`

**Indexes:** PK(`id`)

**FKs:**

| Column | References | ON DELETE | ON UPDATE |
|---|---|---|---|
| `serviceId` | `Service(id)` | **CASCADE** | CASCADE |

**Reverse:** `customValues` → OrderCustomFieldValue[]

---

## Table 5: `Supplier`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| name | TEXT | NO | — |
| email | TEXT | YES | — |
| phone | TEXT | YES | — |
| website | TEXT | YES | — |
| type | TEXT | NO | — |
| status | TEXT | NO | `'active'` |
| successRate | DOUBLE PRECISION | NO | `100` |
| totalOrders | INTEGER | NO | `0` |
| priority | INTEGER | NO | `1` |
| apiKey | TEXT | YES | — |
| config | TEXT | YES | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |
| updatedAt | TIMESTAMP(3) | NO | — |

**Indexes:** PK(`id`)

**FKs:** None

**Reverse:** `services` → Service[], `orders` → Order[]

---

## Table 6: `Order`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| orderNumber | TEXT | NO | — |
| userId | TEXT | NO | — |
| serviceId | TEXT | NO | — |
| supplierId | TEXT | YES | — |
| imei | TEXT | YES | — |
| deviceInfo | TEXT | YES | — |
| status | TEXT | NO | `'pending'` |
| priority | TEXT | NO | `'normal'` |
| assignedTo | TEXT | YES | — |
| cost | DOUBLE PRECISION | NO | — |
| sellingPrice | DOUBLE PRECISION | NO | — |
| profit | DOUBLE PRECISION | NO | `0` |
| notes | TEXT | YES | — |
| internalNotes | TEXT | YES | — |
| result | TEXT | YES | — |
| completedAt | TIMESTAMP(3) | YES | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |
| updatedAt | TIMESTAMP(3) | NO | — |

**Indexes:** PK(`id`), UNIQUE(`orderNumber`), COMPOSITE BTREE(`userId`, `status`, `createdAt`), BTREE(`status`), BTREE(`assignedTo`), BTREE(`priority`)

**FKs:**

| Column | References | ON DELETE | ON UPDATE |
|---|---|---|---|
| `userId` | `User(id)` | **RESTRICT** | CASCADE |
| `serviceId` | `Service(id)` | **RESTRICT** | CASCADE |
| `supplierId` | `Supplier(id)` | **SET NULL** | CASCADE |

**Note:** `assignedTo` has **no FK constraint** — loose ref to admin User.id.

**Reverse:** `transactions` → Transaction[], `customValues` → OrderCustomFieldValue[], `orderNotes` → OrderNote[]

---

## Table 7: `OrderNote`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| orderId | TEXT | NO | — |
| authorId | TEXT | NO | — |
| authorName | TEXT | NO | — |
| content | TEXT | NO | — |
| visible | BOOLEAN | NO | `true` |
| createdAt | TIMESTAMP(3) | NO | `now()` |

**Indexes:** PK(`id`), BTREE(`orderId`), BTREE(`authorId`)

**FKs:**

| Column | References | ON DELETE | ON UPDATE |
|---|---|---|---|
| `orderId` | `Order(id)` | **CASCADE** | CASCADE |

**Note:** `authorId` has **no FK constraint** — notes survive user deletion. `authorName` denormalized.

---

## Table 8: `OrderCustomFieldValue`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| orderId | TEXT | NO | — |
| customFieldId | TEXT | NO | — |
| value | TEXT | NO | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |

**Indexes:** PK(`id`)

**FKs:**

| Column | References | ON DELETE | ON UPDATE |
|---|---|---|---|
| `orderId` | `Order(id)` | **CASCADE** | CASCADE |
| `customFieldId` | `ServiceCustomField(id)` | **RESTRICT** | CASCADE |

**Cascade:** Deleting Order → cascades. Deleting ServiceCustomField → **blocked** if values exist.

---

## Table 9: `Transaction`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| userId | TEXT | NO | — |
| orderId | TEXT | YES | — |
| type | TEXT | NO | — |
| amount | DOUBLE PRECISION | NO | — |
| balanceAfter | DOUBLE PRECISION | NO | — |
| description | TEXT | YES | — |
| status | TEXT | NO | `'completed'` |
| reference | TEXT | YES | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |

**type values:** `deposit`, `withdraw`, `transfer`, `order_payment`, `order_refund`

**Indexes:** PK(`id`), COMPOSITE BTREE(`userId`, `type`, `createdAt`)

**FKs:**

| Column | References | ON DELETE | ON UPDATE |
|---|---|---|---|
| `userId` | `User(id)` | **RESTRICT** | CASCADE |
| `orderId` | `Order(id)` | **SET NULL** | CASCADE |

---

## Table 10: `Log`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| level | TEXT | NO | — |
| message | TEXT | NO | — |
| source | TEXT | YES | — |
| details | TEXT | YES | — |
| userId | TEXT | YES | — |
| ip | TEXT | YES | — |
| userAgent | TEXT | YES | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |

**level values:** `info`, `warn`, `error`, `debug`

**Indexes:** PK(`id`), COMPOSITE BTREE(`level`, `createdAt`), BTREE(`source`)

**FKs:**

| Column | References | ON DELETE | ON UPDATE |
|---|---|---|---|
| `userId` | `User(id)` | **SET NULL** | CASCADE |

---

## Table 11: `AuditLog`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| userId | TEXT | YES | — |
| userEmail | TEXT | YES | — |
| action | TEXT | NO | — |
| entityType | TEXT | NO | — |
| entityId | TEXT | YES | — |
| description | TEXT | YES | — |
| module | TEXT | YES | — |
| oldValues | TEXT | YES | — |
| newValues | TEXT | YES | — |
| ip | TEXT | YES | — |
| userAgent | TEXT | YES | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |

**Indexes:** PK(`id`), BTREE(`userId`), COMPOSITE BTREE(`entityType`, `entityId`), BTREE(`action`), BTREE(`module`), BTREE(`createdAt`)

**FKs:** None — fully denormalized, survives user deletion.

---

## Table 12: `Notification`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| userId | TEXT | NO | — |
| title | TEXT | NO | — |
| message | TEXT | NO | — |
| type | TEXT | NO | `'info'` |
| read | BOOLEAN | NO | `false` |
| link | TEXT | YES | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |

**type values:** `info`, `success`, `warning`, `error`

**Indexes:** PK(`id`), COMPOSITE BTREE(`userId`, `read`), BTREE(`createdAt`)

**FKs:** None — `userId` app-level reference only.

---

## Table 13: `ApiKey`

| Column | Type | Nullable | Default |
|---|---|---|---|
| **id** | TEXT | NO | `cuid()` |
| name | TEXT | NO | — |
| keyHash | TEXT | NO | — |
| keyPrefix | TEXT | NO | — |
| userId | TEXT | NO | — |
| status | TEXT | NO | `'active'` |
| permissions | TEXT | NO | `'read'` |
| requestLimit | INTEGER | NO | `100` |
| totalRequests | INTEGER | NO | `0` |
| lastUsedAt | TIMESTAMP(3) | YES | — |
| expiresAt | TIMESTAMP(3) | YES | — |
| createdAt | TIMESTAMP(3) | NO | `now()` |
| updatedAt | TIMESTAMP(3) | NO | — |

**Indexes:** PK(`id`), UNIQUE(`keyHash`), BTREE(`userId`)

**FKs:** None — `userId` app-level reference only.

---

## Cascade Rules Summary

| Relationship | ON DELETE | ON UPDATE |
|---|---|---|
| User.resellerId → User.id | SET NULL | CASCADE |
| Service.categoryId → ServiceCategory.id | SET NULL | CASCADE |
| Service.supplierId → Supplier.id | SET NULL | CASCADE |
| ServiceCustomField.serviceId → Service.id | **CASCADE** | CASCADE |
| Order.userId → User.id | **RESTRICT** | CASCADE |
| Order.serviceId → Service.id | **RESTRICT** | CASCADE |
| Order.supplierId → Supplier.id | SET NULL | CASCADE |
| OrderNote.orderId → Order.id | **CASCADE** | CASCADE |
| OrderCustomFieldValue.orderId → Order.id | **CASCADE** | CASCADE |
| OrderCustomFieldValue.customFieldId → ServiceCustomField.id | **RESTRICT** | CASCADE |
| Transaction.userId → User.id | **RESTRICT** | CASCADE |
| Transaction.orderId → Order.id | SET NULL | CASCADE |
| Log.userId → User.id | SET NULL | CASCADE |

**No FK constraint (app-level only):** Notification.userId, ApiKey.userId, Order.assignedTo, OrderNote.authorId, AuditLog.userId

---

## Cardinality Map

```
User (1) ──────── (N) User            [self-ref: reseller → clients]
User (1) ──────── (N) Order
User (1) ──────── (N) Transaction
User (1) ──────── (N) Log
User (1) ──────── (N) Notification    [no FK]
User (1) ──────── (N) ApiKey          [no FK]

ServiceCategory (1) ── (N) Service
Supplier (1) ──────── (N) Service
Supplier (1) ──────── (N) Order

Service (1) ──────── (N) Order
Service (1) ──────── (N) ServiceCustomField

ServiceCustomField (1) ── (N) OrderCustomFieldValue

Order (1) ──────── (N) OrderNote
Order (1) ──────── (N) OrderCustomFieldValue
Order (1) ──────── (N) Transaction
```
