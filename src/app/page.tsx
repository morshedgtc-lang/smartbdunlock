"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Smartphone, ArrowRight, Shield, Zap, Globe, TrendingUp,
  Users, Package, ShoppingCart, FileText, CreditCard,
  CheckCircle, Lock, Headphones, BarChart3, Clock, Star
} from 'lucide-react';

const features = [
  { icon: Shield, title: 'Dynamic Services', desc: 'Admin creates any service with custom fields — IMEI, photo uploads, custom forms', color: 'from-blue-500 to-cyan-500' },
  { icon: Zap, title: 'Instant Orders', desc: 'Reseller submits orders with auto-generated service-specific forms', color: 'from-purple-500 to-fuchsia-500' },
  { icon: Globe, title: 'USDT Payments', desc: 'Secure wallet system with admin-approved deposits and real-time balance tracking', color: 'from-emerald-500 to-teal-500' },
  { icon: Lock, title: '7-Day Secure Links', desc: 'File uploads with automatic expiry and secure time-limited download URLs', color: 'from-amber-500 to-orange-500' },
  { icon: Users, title: 'Role-Based Access', desc: 'Admin and Reseller panels with granular permissions and wallet management', color: 'from-rose-500 to-pink-500' },
  { icon: BarChart3, title: 'Live Dashboard', desc: 'Real-time analytics, revenue tracking, and order status monitoring', color: 'from-indigo-500 to-blue-500' },
];

const services = [
  { icon: Smartphone, name: 'Samsung Network Unlock', fields: ['IMEI', 'Lock Screen Photo', 'Notes'], price: '25', time: '1-24h' },
  { icon: Shield, name: 'iPhone iCloud Check', fields: ['IMEI', 'Serial Number'], price: '30', time: '2-48h' },
  { icon: FileText, name: 'FRP Bypass Service', fields: ['Serial Number', 'Device Photo', 'Customer Note'], price: '40', time: '4-72h' },
];

const steps = [
  { num: '01', title: 'Sign In', desc: 'Log in as a reseller and get instant access to the platform' },
  { num: '02', title: 'Fund Wallet', desc: 'Deposit USDT and get admin-approved balance for placing orders' },
  { num: '03', title: 'Place Orders', desc: 'Select a service, fill the dynamic form, and submit instantly' },
  { num: '04', title: 'Track Results', desc: 'Monitor order status in real-time and download results securely' },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Nav */}
      <nav className="header sticky top-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-xl bg-[var(--background)]/80 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Smartphone size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-[var(--foreground)]">SmartBD Unlock</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <motion.button
              className="px-5 py-2.5 rounded-2xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-bg)] hover:border hover:border-[var(--card-border)] transition-all cursor-pointer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Sign In
            </motion.button>
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-6 pt-24 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-[var(--accent)] font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Enterprise GSM Platform v1.0
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[var(--foreground)] leading-[1.1] mb-6">
                The Future of{' '}
                <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Mobile Unlocking
                </span>
              </h1>

              <p className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
                Dynamic service fields, secure file uploads, and role-based access — 
                everything you need to run a professional GSM unlocking business.
              </p>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/login">
                  <motion.button
                    className="glass-btn px-8 py-3.5 text-base flex items-center gap-2 cursor-pointer"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Sign In <ArrowRight size={18} />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-14"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">How It Works</h2>
              <p className="text-[var(--muted)] max-w-lg mx-auto">Get started in 4 simple steps — from signup to your first completed order.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  className="glass-premium p-6 text-left relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <span className="text-5xl font-black text-white/5 absolute top-4 right-4">{step.num}</span>
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm mb-4 shadow-lg shadow-indigo-500/20">
                    {step.num}
                  </div>
                  <h3 className="font-bold text-[var(--foreground)] mb-2">{step.title}</h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-20 bg-white/3 dark:bg-white/[0.02]">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-14"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">Everything You Need</h2>
              <p className="text-[var(--muted)] max-w-lg mx-auto">A complete platform built for GSM service resellers with admin management.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  className="glass-premium p-7 text-left"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg mb-5`}>
                    <f.icon size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-[var(--foreground)] mb-2 text-lg">{f.title}</h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Preview */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-14"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">Supported Services</h2>
              <p className="text-[var(--muted)] max-w-lg mx-auto">Admin defines services with custom fields — resellers see auto-generated order forms.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((service, i) => (
                <motion.div
                  key={i}
                  className="glass-premium p-7 text-left"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-5">
                    <service.icon size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-[var(--foreground)] mb-4 text-lg">{service.name}</h3>
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                      <CreditCard size={14} /> ${service.price} USDT
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-500">
                      <Clock size={14} /> {service.time}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {service.fields.map((field, j) => (
                      <span key={j} className="px-2.5 py-1 bg-[var(--card-bg)] text-[var(--muted)] rounded-full text-xs border border-[var(--card-border)]">
                        {field}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="glass-premium p-12 text-center glow-border relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">Ready to Get Started?</h2>
                <p className="text-lg text-[var(--muted)] mb-8 max-w-xl mx-auto">
                  Join hundreds of resellers using SmartBD Unlock for their mobile device unlocking services.
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Link href="/login">
                    <motion.button
                      className="glass-btn px-8 py-3.5 text-base flex items-center gap-2 cursor-pointer"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Sign In <ArrowRight size={18} />
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-[var(--card-border)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Smartphone size={16} className="text-white" />
            </div>
            <span className="font-bold text-[var(--foreground)]">SmartBD Unlock</span>
          </div>
          <p className="text-sm text-[var(--muted)]">&copy; 2026 SmartBD Unlock. Enterprise GSM Service Platform.</p>
          <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
            <a href="#" className="hover:text-[var(--foreground)] transition-colors">Terms</a>
            <a href="#" className="hover:text-[var(--foreground)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--foreground)] transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const dynamic = "force-static";
