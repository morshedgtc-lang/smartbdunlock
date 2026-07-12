# MASTER PLAN — SmartBD Unlock

## GSM Mobile Service Reseller Management Platform

**Version:** 1.0.0  
**Status:** PLANNING  
**Created:** 2026-07-10

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [API Design](#api-design)
6. [Order Engine](#order-engine)
7. [Supplier Connector System](#supplier-connector-system)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Security](#security)
10. [UI/UX Design](#uiux-design)
11. [Deployment](#deployment)
12. [Testing Strategy](#testing-strategy)
13. [Development Phases](#development-phases)
14. [File Structure](#file-structure)

---

## Project Overview

**Purpose:**  
Production-ready web application for mobile repair shops, technicians, and service resellers managing IMEI services, device unlocks, and GSM-related operations.

**Core Capabilities:**

- Multi-tier reseller hierarchy (Super Admin → Master Reseller → Reseller → Customer)
- Automated order processing via supplier API connectors
- Real-time wallet/credit system
- Premium SaaS dashboard with dark/light themes
- Comprehensive audit logging
- Modular supplier integration framework

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Next.js)                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Admin   │  │ Reseller │  │Customer │  │  Auth   │        │
│  │Dashboard │  │  Panel   │  │ Portal  │  │ Pages   │        │
│  └────┬─────┘  └────┬─────┘  └────┬────┘  └────┬────┘        │
│       └──────────────┴─────────────┴─────────────┘            │
│                          │                                    │
│                    REST API Client                            │
└──────────────────────────┼───────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   API Layer  │
                    │  (Next.js    │
                    │   API Routes)│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │  Prisma   │ │ Redis │ │  BullMQ   │
        │  Client   │ │Cache  │ │  Queues   │
        └─────┬─────┘ └───────┘ └─────┬─────┘
              │                        │
        ┌─────▼─────┐            ┌─────▼─────┐
        │PostgreSQL │            │  Supplier  │
        │ Database  │            │ Connectors │
        └───────────┘            └───────────┘
```

**Design Principles:**

- Monorepo structure with clear separation
- API-first design
- Event-driven order processing
- Stateless horizontal scaling
- Defense in depth security

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | Next.js | 14.x (App Router) | React framework |
| Language | TypeScript | 5.x | Type safety |
| Styling | Tailwind CSS | 4.x | Utility CSS |
| UI Components | shadcn/ui + Radix | latest | Accessible components |
| 3D Graphics | Three.js | 0.170.x | 3D backgrounds |
| 3D React | @react-three/fiber | 9.x | React Three.js |
| 3D Helpers | @react-three/drei | 9.x | Glass materials, environment |
| Animations | Framer Motion | 12.x | Page transitions, micro-interactions |
| Backend | Next.js API Routes | - | REST API |
| ORM | Prisma | 5.x | Database client |
| Database | PostgreSQL | 16.x | Primary storage |
| Cache | Redis | 7.x | Session cache, queues |
| Queue | BullMQ | 5.x | Background jobs |
| Auth | jose | latest | JWT tokens |
| Validation | Zod | latest | Schema validation |
| Testing | Vitest | latest | Unit tests |
| Package Manager | pnpm | 9.x | Dependencies |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16.x |
| Cache | Redis | 7.x |
| Queue | BullMQ | 5.x |
| Auth | JWT (jose) | - |
| Validation | Zod | - |
| Testing | Vitest + Supertest | - |
| Container | Docker | - |
| Package Manager | pnpm | - |

---

## Database Schema

### Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'MASTER_RESELLER', 'RESELLER', 'CUSTOMER')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED')),
    parent_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Wallets

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_balance CHECK (balance >= 0)
);
```

### Wallet Transactions

```sql
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAW', 'ORDER_PAYMENT', 'REFUND', 'COMMISSION')),
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Services

```sql
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    description TEXT,
    supplier_id UUID REFERENCES suppliers(id),
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    processing_time VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Orders

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    service_id UUID NOT NULL REFERENCES services(id),
    device_brand VARCHAR(50) NOT NULL,
    device_model VARCHAR(50) NOT NULL,
    imei VARCHAR(20),
    serial VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    supplier_reference VARCHAR(100),
    cost DECIMAL(10,2) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Suppliers

```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    api_url VARCHAR(255) NOT NULL,
    api_key VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Audit Logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## API Design

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get tokens |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Invalidate tokens |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/users | List users (admin) | SUPER_ADMIN |
| GET | /api/users/:id | Get user details | SELF/ADMIN |
| PATCH | /api/users/:id | Update user | SELF/ADMIN |
| PATCH | /api/users/:id/status | Toggle status | SUPER_ADMIN |
| DELETE | /api/users/:id | Soft delete user | SUPER_ADMIN |

### Wallet

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/wallet | Get own wallet | ANY |
| POST | /api/wallet/deposit | Request deposit | CUSTOMER+ |
| GET | /api/wallet/transactions | Transaction history | ANY |
| POST | /api/wallet/transfer | Transfer to sub-user | MASTER_RESELLER+ |

### Services

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/services | List services | ANY |
| GET | /api/services/:id | Get service details | ANY |
| POST | /api/services | Create service | SUPER_ADMIN |
| PATCH | /api/services/:id | Update service | SUPER_ADMIN |
| DELETE | /api/services/:id | Deactivate service | SUPER_ADMIN |

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/orders | List orders | ROLE_FILTERED |
| GET | /api/orders/:id | Get order details | OWNER/ADMIN |
| POST | /api/orders | Create order | RESELLER+ |
| PATCH | /api/orders/:id/cancel | Cancel order | OWNER/ADMIN |
| GET | /api/orders/:id/status | Check order status | OWNER/ADMIN |

### Suppliers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/suppliers | List suppliers | SUPER_ADMIN |
| POST | /api/suppliers | Create supplier | SUPER_ADMIN |
| PATCH | /api/suppliers/:id | Update supplier | SUPER_ADMIN |
| DELETE | /api/suppliers/:id | Remove supplier | SUPER_ADMIN |
| POST | /api/suppliers/:id/test | Test connection | SUPER_ADMIN |

### Dashboard

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/dashboard/stats | Get dashboard stats | SUPER_ADMIN |
| GET | /api/dashboard/revenue | Revenue reports | SUPER_ADMIN |
| GET | /api/dashboard/orders | Order analytics | SUPER_ADMIN |

---

## Order Engine

### Processing Flow

```
┌─────────────┐
│ Create Order │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Validate   │────▶│  Insufficient│
│   Balance   │ YES │   Balance    │──▶ RETURN ERROR
└──────┬──────┘     └─────────────┘
       │ NO
       ▼
┌─────────────┐
│ Create DB   │
│   Record    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Deduct     │
│   Wallet    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Enqueue Job │
│ (BullMQ)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Worker    │
│  Processes  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Find Best  │────▶│  Supplier   │
│  Supplier   │     │   API Call  │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────▼─────┐            ┌─────▼─────┐
        │  Success   │            │  Failure   │
        └─────┬─────┘            └─────┬─────┘
              │                         │
              ▼                         ▼
        ┌─────────────┐          ┌─────────────┐
        │  Poll for   │          │  Mark Failed │
        │  Result     │          │  Refund      │
        └──────┬──────┘          └─────────────┘
               │
               ▼
        ┌─────────────┐
        │  Update     │
        │  Order      │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │  Notify     │
        │  User       │
        └─────────────┘
```

### Job Types

```typescript
// BullMQ Job Types
enum OrderJobType {
  PROCESS_ORDER = 'process-order',
  CHECK_STATUS = 'check-order-status',
  FETCH_RESULT = 'fetch-order-result',
  CANCEL_ORDER = 'cancel-order',
}
```

---

## Supplier Connector System

### Interface

```typescript
interface SupplierConnector {
  name: string;
  baseUrl: string;
  apiKey: string;

  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  checkStatus(orderRef: string): Promise<OrderStatusResult>;
  getResult(orderRef: string): Promise<OrderResult>;
  cancelOrder(orderRef: string): Promise<CancelResult>;
}

interface CreateOrderParams {
  serviceId: string;
  imei: string;
  serial?: string;
  deviceBrand: string;
  deviceModel: string;
}

interface CreateOrderResult {
  success: boolean;
  reference: string;
  error?: string;
}

interface OrderStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTime?: number;
}

interface OrderResult {
  success: boolean;
  result: string;
  error?: string;
}

interface CancelResult {
  success: boolean;
  error?: string;
}
```

### Supplier Directory Structure

```
/src/modules/suppliers/
├── supplier.interface.ts
├── supplier.factory.ts
├── supplier.registry.ts
├── connectors/
│   ├── base.connector.ts
│   ├── supplier-one.connector.ts
│   ├── supplier-two.connector.ts
│   └── supplier-three.connector.ts
└── supplier.service.ts
```

---

## User Roles & Permissions

### Role Hierarchy

```
SUPER_ADMIN
└── MASTER_RESELLER
    └── RESELLER
        └── CUSTOMER
```

### Permission Matrix

| Action | SUPER_ADMIN | MASTER_RESELLER | RESELLER | CUSTOMER |
|--------|-------------|-----------------|----------|----------|
| Manage Users | ALL | SUB | NONE | NONE |
| Manage Services | YES | VIEW | VIEW | VIEW |
| Manage Suppliers | YES | NONE | NONE | NONE |
| Create Orders | ALL | YES | YES | NONE |
| View Orders | ALL | SUB | OWN | OWN |
| Wallet: View | ALL | OWN | OWN | OWN |
| Wallet: Deposit | ALL | YES | YES | YES |
| Wallet: Transfer | ALL | YES | NONE | NONE |
| View Reports | ALL | SUB | OWN | OWN |
| System Settings | YES | NONE | NONE | NONE |

---

## Security

### Authentication

- Access Token: 15-minute expiry
- Refresh Token: 7-day expiry, httpOnly cookie
- Password: bcrypt (12 rounds)
- JWT signed with RS256

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| /api/auth/login | 5 req/min |
| /api/auth/register | 3 req/min |
| /api/orders | 30 req/min |
| General API | 100 req/min |

### Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
```

### Audit Logging

Track: login, logout, order creation, wallet changes, admin actions, permission changes, supplier configuration.

---

## UI/UX Design — 3D Liquid Glass System

### Design Philosophy

Premium SaaS aesthetic combining Apple-inspired Liquid Glass with 3D depth. Every element feels tactile, layered, and alive. The interface adapts seamlessly between dark and light modes while maintaining the glass material language.

---

### Core Design Libraries

```json
{
  "three": "^0.170.0",
  "@react-three/fiber": "^9.0.0",
  "@react-three/drei": "^9.117.0",
  "framer-motion": "^12.0.0",
  "tailwindcss": "^4.0.0"
}
```

---

### Theme System — Dual Mode

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Mode — Deep Space
        dark: {
          bg: '#050510',
          surface: '#0a0a1a',
          card: 'rgba(255,255,255,0.03)',
          border: 'rgba(255,255,255,0.08)',
          text: '#e8e8f0',
          muted: '#6b7280',
          accent: '#6366f1',
          accentGlow: 'rgba(99,102,241,0.3)',
        },
        // Light Mode — Cloud
        light: {
          bg: '#f0f4f8',
          surface: '#ffffff',
          card: 'rgba(255,255,255,0.7)',
          border: 'rgba(0,0,0,0.08)',
          text: '#1e293b',
          muted: '#64748b',
          accent: '#4f46e5',
          accentGlow: 'rgba(79,70,229,0.2)',
        },
      },
      backdropBlur: {
        glass: '16px',
        glassHeavy: '24px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
        glassHover: '0 12px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
        glassDark: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        glow: '0 0 30px rgba(99,102,241,0.3)',
      },
    },
  },
}
```

---

### Liquid Glass CSS Classes

```css
/* globals.css */

/* Base Glass — Dark Mode */
.glass-dark {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Base Glass — Light Mode */
.glass-light {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* Liquid Glass with Refraction (SVG Filter) */
.liquid-glass {
  position: relative;
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-radius: 20px;
  overflow: hidden;
}

.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  pointer-events: none;
}

.liquid-glass::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 255, 255, 0.03) 60deg,
    transparent 120deg
  );
  animation: glassShine 8s linear infinite;
  pointer-events: none;
}

@keyframes glassShine {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Glowing Border Animation */
.glow-border {
  position: relative;
}

.glow-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.5),
    rgba(168, 85, 247, 0.5),
    rgba(59, 130, 246, 0.5),
    rgba(99, 102, 241, 0.5)
  );
  background-size: 300% 300%;
  animation: borderGlow 4s ease infinite;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  pointer-events: none;
}

@keyframes borderGlow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

---

### SVG Liquid Distortion Filter

```html
<!-- Add to layout.tsx for liquid glass refraction effect -->
<svg style="position: absolute; width: 0; height: 0;">
  <filter id="liquid-distortion">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.015"
      numOctaves="3"
      result="noise"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="noise"
      scale="4"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
</svg>
```

---

### 3D Background Component

```tsx
// components/3d/BackgroundScene.tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { Float, MeshTransmissionMaterial, Environment } from '@react-three/drei'
import { useTheme } from 'next-themes'

function GlassSphere({ position, scale }: { position: [number, number, number], scale: number }) {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh position={position} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshTransmissionMaterial
          backside
          thickness={0.3}
          chromaticAberration={0.02}
          anisotropy={0.1}
          distortion={0.2}
          temporalDistortion={0.1}
          iridescence={1}
          iridescenceIOR={1}
          iridescenceThicknessRange={[0, 1400]}
          roughness={0}
          transmission={1}
          ior={1.5}
        />
      </mesh>
    </Float>
  )
}

export default function BackgroundScene() {
  const { theme } = useTheme()

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <GlassSphere position={[-3, 2, -5]} scale={1.5} />
        <GlassSphere position={[4, -1, -8]} scale={2} />
        <GlassSphere position={[0, 3, -12]} scale={3} />
        <Environment preset={theme === 'dark' ? 'night' : 'city'} />
      </Canvas>
      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  )
}
```

---

### Card Components

```tsx
// components/ui/GlassCard.tsx
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

export function GlassCard({ children, className = '', hover = true, glow = false }: GlassCardProps) {
  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/5 dark:bg-white/5
        backdrop-blur-xl backdrop-saturate-150
        border border-white/10 dark:border-white/10
        shadow-lg dark:shadow-glassDark
        ${glow ? 'glow-border' : ''}
        ${className}
      `}
      whileHover={hover ? {
        scale: 1.02,
        boxShadow: '0 20px 60px rgba(99,102,241,0.15)',
      } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}
```

---

### 3D Button Component

```tsx
// components/ui/Button3D.tsx
'use client'

import { motion } from 'framer-motion'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface Button3DProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button3D = forwardRef<HTMLButtonElement, Button3DProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'relative overflow-hidden rounded-xl font-medium transition-all duration-300'

    const variants = {
      primary: `
        bg-gradient-to-r from-indigo-500 to-purple-500
        text-white shadow-lg shadow-indigo-500/25
        hover:shadow-xl hover:shadow-indigo-500/40
        hover:from-indigo-400 hover:to-purple-400
      `,
      secondary: `
        bg-white/10 dark:bg-white/10
        backdrop-blur-md border border-white/20
        text-gray-800 dark:text-white
        hover:bg-white/20 dark:hover:bg-white/15
      `,
      ghost: `
        bg-transparent text-gray-600 dark:text-gray-300
        hover:bg-white/10 dark:hover:bg-white/5
      `,
    }

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }

    return (
      <motion.button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        {...props}
      >
        {/* 3D depth effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
        <span className="relative z-10">{children}</span>
      </motion.button>
    )
  }
)
```

---

### Theme Toggle Component

```tsx
// components/ui/ThemeToggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <motion.button
      className="relative w-14 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-1"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      whileTap={{ scale: 0.95 }}
    >
      <AnimatePresence mode="wait">
        {theme === 'dark' ? (
          <motion.div
            key="moon"
            className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 shadow-lg"
            initial={{ x: 0 }}
            animate={{ x: 0 }}
            exit={{ x: -24, opacity: 0 }}
          />
        ) : (
          <motion.div
            key="sun"
            className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 shadow-lg"
            initial={{ x: 24 }}
            animate={{ x: 24 }}
            exit={{ x: 0, opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}
```

---

### Background Gradient Presets

```typescript
// lib/theme-gradients.ts
export const backgrounds = {
  dark: {
    hero: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.1) 0%, transparent 50%), #050510',
    sidebar: 'linear-gradient(180deg, rgba(10,10,26,0.95) 0%, rgba(5,5,16,0.98) 100%)',
    card: 'rgba(255,255,255,0.03)',
    input: 'rgba(255,255,255,0.05)',
  },
  light: {
    hero: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.08) 0%, transparent 50%), #f0f4f8',
    sidebar: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,244,248,0.98) 100%)',
    card: 'rgba(255,255,255,0.7)',
    input: 'rgba(255,255,255,0.8)',
  },
}
```

---

### Page Layout

```
┌──────────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌────────────────────────────────────────┐ │
│  │ Sidebar │  │  Header (Glass)                        │ │
│  │ (Glass) │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │ │
│  │         │  │  │Stats │ │Stats │ │Stats │ │Stats │  │ │
│  │  Logo   │  │  └──────┘ └──────┘ └──────┘ └──────┘  │ │
│  │  ─────  │  ├────────────────────────────────────────┤ │
│  │  Nav    │  │                                        │ │
│  │  Items  │  │  Main Content (Glass Cards)            │ │
│  │  ─────  │  │  ┌──────────┐  ┌──────────┐           │ │
│  │         │  │  │  Card 1  │  │  Card 2  │           │ │
│  │  User   │  │  └──────────┘  └──────────┘           │ │
│  │  Theme  │  │  ┌──────────┐  ┌──────────┐           │ │
│  │  Toggle │  │  │  Card 3  │  │  Card 4  │           │ │
│  │  Logout │  │  └──────────┘  └──────────┘           │ │
│  └─────────┘  └────────────────────────────────────────┘ │
│                                                          │
│  3D Background Scene (Three.js) — behind everything      │
└──────────────────────────────────────────────────────────┘
```

---

### Animation Library

```typescript
// lib/animations.ts
export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' },
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { type: 'spring', stiffness: 300, damping: 25 },
}

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: 'easeOut' },
}
```

---

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Depth** | Multiple glass layers with varying blur/opacity |
| **Light** | Specular highlights, gradient borders, glow effects |
| **Motion** | Framer Motion spring animations, CSS keyframes |
| **Adaptivity** | Full dark/light mode with smooth transitions |
| **Performance** | GPU-accelerated blur, lazy 3D scenes, fallbacks |
| **Accessibility** | `prefers-reduced-motion`, proper contrast ratios |

---

### Fallback Strategy

```css
/* For older browsers or reduced motion */
@media (prefers-reduced-motion: reduce) {
  .liquid-glass::after,
  .glow-border::before {
    animation: none;
  }
}

/* Fallback for no backdrop-filter support */
@supports not (backdrop-filter: blur(1px)) {
  .glass-dark {
    background: rgba(10, 10, 26, 0.95);
  }
  .glass-light {
    background: rgba(255, 255, 255, 0.95);
  }
}
```

---

## Deployment

### Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL
      - REDIS_URL
      - JWT_SECRET
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: smartbd_unlock
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/smartbd_unlock

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-refresh-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads
```

---

## Testing Strategy

### Unit Tests

- Service functions
- Utility functions
- Validation schemas
- Permission checks

### Integration Tests

- API endpoints
- Database operations
- Wallet transactions
- Order workflow

### E2E Tests (Future)

- Login flow
- Order creation
- Payment flow

---

## Development Phases

### Phase 1: Foundation (Week 1)

- [ ] Project setup (Next.js, TypeScript, Tailwind)
- [ ] Database schema & Prisma setup
- [ ] Authentication system (JWT)
- [ ] Base API structure
- [ ] Docker setup

### Phase 2: Core Backend (Week 2)

- [ ] User management CRUD
- [ ] Wallet system
- [ ] Service management
- [ ] Order engine
- [ ] Supplier connector framework

### Phase 3: Admin Dashboard (Week 3)

- [ ] Dashboard layout
- [ ] User management pages
- [ ] Service management pages
- [ ] Order management pages
- [ ] Finance/reports pages

### Phase 4: Reseller & Customer Panels (Week 4)

- [ ] Reseller dashboard
- [ ] Reseller order flow
- [ ] Customer portal
- [ ] Order tracking

### Phase 5: Polish & Deploy (Week 5)

- [ ] UI/UX polish
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment setup

---

## File Structure

```
smartbdunlock/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   ├── reseller/
│   │   │   ├── customer/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── wallet/
│   │   │   ├── services/
│   │   │   ├── orders/
│   │   │   ├── suppliers/
│   │   │   └── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── 3d/                    ← 3D scene components
│   │   │   ├── BackgroundScene.tsx
│   │   │   ├── GlassSphere.tsx
│   │   │   └── FloatingOrbs.tsx
│   │   ├── ui/ (shadcn + glass)
│   │   │   ├── GlassCard.tsx
│   │   │   ├── Button3D.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── GlassInput.tsx
│   │   ├── dashboard/
│   │   ├── forms/
│   │   └── shared/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── auth.ts
│   │   ├── queue.ts
│   │   ├── utils.ts
│   │   └── theme-gradients.ts    ← Theme gradient presets
│   ├── hooks/
│   │   └── useTheme.ts
│   ├── modules/
│   │   ├── users/
│   │   ├── wallet/
│   │   ├── services/
│   │   ├── orders/
│   │   └── suppliers/
│   │       ├── supplier.interface.ts
│   │       ├── supplier.factory.ts
│   │       ├── supplier.registry.ts
│   │       └── connectors/
│   ├── types/
│   └── middleware.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   ├── CHANGELOG.md
│   └── AI_PROGRESS.md
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example
├── .gitignore
├── MASTER_PLAN.md
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## Status

| Phase | Status |
|-------|--------|
| Planning | ✅ Complete |
| Foundation | ⏳ Pending |
| Backend | ⏳ Pending |
| Admin Dashboard | ⏳ Pending |
| Reseller/Customer | ⏳ Pending |
| Polish & Deploy | ⏳ Pending |

---

## Next Steps

1. Initialize Next.js project with TypeScript
2. Set up Prisma with PostgreSQL schema
3. Implement authentication system
4. Create base API structure
5. Build dashboard layout

---

*This document is the source of truth for the SmartBD Unlock project architecture and implementation plan.*
