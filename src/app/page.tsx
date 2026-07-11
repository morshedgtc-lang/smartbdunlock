"use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Smartphone, ArrowRight, Shield, Zap, Globe, TrendingUp, Users, Package, ShoppingCart, FileText, CreditCard } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Dynamic Services',
    desc: 'Admin creates any service fields - IMEI, photo uploads, custom forms',
    color: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-600',
  },
  {
    icon: Zap,
    title: 'Instant Orders',
    desc: 'Reseller submits orders with service-specific fields automatically',
    color: 'from-purple-500 to-fuchsia-500',
    iconColor: 'text-purple-600',
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    desc: 'USDT payments with admin-approved reseller wallets and deposit requests',
    color: 'from-emerald-500 to-teal-500',
    iconColor: 'text-emerald-600',
  },
  {
    icon: TrendingUp,
    title: '7-Day Secure Links',
    desc: 'File uploads expire in 7 days with automatic cleanup',
    color: 'from-amber-500 to-orange-500',
    iconColor: 'text-amber-600',
  },
];

const servicesExamples = [
  {
    name: 'Samsung Network Unlock',
    icon: Smartphone,
    fields: ['IMEI', 'Lock Screen Photo', 'Notes'],
    price: '25 USDT',
    processing: '1-24 Hours',
  },
  {
    name: 'iPhone Check',
    icon: Shield,
    fields: ['IMEI', 'Serial Number'],
    price: '30 USDT',
    processing: '2-48 Hours',
  },
  {
    name: 'FRP Service',
    icon: FileText,
    fields: ['Serial Number', 'Device Photo', 'Customer Note'],
    price: '40 USDT',
    processing: '4-72 Hours',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="header sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Smartphone size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-[var(--foreground)]">unlockOS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <motion.button
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-[var(--foreground)] hover:bg-white/10 dark:hover:bg-white/5 transition-colors cursor-pointer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Sign In
            </motion.button>
          </Link>
          <Link href="/register">
            <motion.button
              className="glass-btn px-5 py-2.5 text-sm cursor-pointer"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started
            </motion.button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-[var(--accent)] font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Dynamic Service Platform v1.0
            </div>

            <h1 className="text-6xl md:text-8xl font-bold text-[var(--foreground)] leading-tight mb-6">
              Enterprise GSM{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Platform
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-[var(--muted)] max-w-3xl mx-auto mb-12 leading-relaxed">
              Production-ready platform with dynamic service fields, secure file uploads, 
              and admin/reseller role-based access for mobile device unlocking services.
            </p>

            <div className="flex items-center justify-center gap-6 flex-wrap mb-16">
              <Link href="/register">
                <motion.button
                  className="glass-btn px-10 py-4 text-lg flex items-center gap-2 cursor-pointer"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Start Free <ArrowRight size={20} />
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  className="glass-btn glass-btn-secondary px-10 py-4 text-lg cursor-pointer"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Demo Login
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Service Examples */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {servicesExamples.map((service, i) => (
              <motion.div
                key={service.name}
                className="glass glass-hover p-8 text-left"
                whileHover={{ scale: 1.05, y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transitionDelay={i * 0.1}
              >
                <div className={`w-14 h-14 rounded-3xl bg-gradient-to-br ${features[i]?.color} flex items-center justify-center shadow-lg mb-6`}>
                  <service.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">{service.name}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <CreditCard size={16} className="text-emerald-600" />
                    <span>{service.price}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <TrendingUp size={16} className="text-blue-600" />
                    <span>{service.processing}</span>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-sm font-medium text-[var(--foreground)] mb-2">Required Fields</p>
                  <div className="flex flex-wrap gap-2">
                    {service.fields.map((field, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Features Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="glass glass-hover p-8 text-left"
                whileHover={{ scale: 1.05, y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transitionDelay={i * 0.1}
              >
                <div className={`w-14 h-14 rounded-3xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg mb-6`}>
                  <f.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">{f.title}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            className="mt-16 glass p-10 glow-border"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-[var(--muted)] mb-8">Join hundreds of resellers using unlockOS for their mobile device unlocking services.</p>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <Link href="/admin/dashboard">
                <button className="px-6 py-3 rounded-xl bg-indigo-500/15 text-indigo-500 text-base font-medium hover:bg-indigo-500/25 transition-colors cursor-pointer border border-indigo-500/20 flex items-center gap-2">
                  <Users size={20} /> Admin Panel
                </button>
              </Link>
              <Link href="/reseller/dashboard">
                <button className="px-6 py-3 rounded-xl bg-purple-500/15 text-purple-500 text-base font-medium hover:bg-purple-500/25 transition-colors cursor-pointer border border-purple-500/20 flex items-center gap-2">
                  <Package size={20} /> Reseller Panel
                </button>
              </Link>
              <Link href="/customer/dashboard">
                <button className="px-6 py-3 rounded-xl bg-emerald-500/15 text-emerald-500 text-base font-medium hover:bg-emerald-500/25 transition-colors cursor-pointer border border-emerald-500/20 flex items-center gap-2">
                  <ShoppingCart size={20} /> Customer Panel
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-center border-t border-[var(--card-border)]">
        <p className="text-sm text-[var(--muted)]">
          unlockOS &copy; 2026 &mdash; Enterprise GSM Service Reseller Platform
        </p>
      </footer>
    </div>
  )
}

export const dynamic = "force-static";