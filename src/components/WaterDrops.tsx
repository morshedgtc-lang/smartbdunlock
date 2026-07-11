'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

interface Drop {
  x: number
  y: number
  r: number
  speed: number
  opacity: number
  wobble: number
  wobbleSpeed: number
}

export function WaterDrops() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const isDark = theme === 'dark'

    const drops: Drop[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 60 + 20,
      speed: Math.random() * 0.3 + 0.1,
      opacity: Math.random() * 0.12 + 0.03,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.008 + 0.003,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const drop of drops) {
        drop.y += drop.speed
        drop.wobble += drop.wobbleSpeed
        drop.x += Math.sin(drop.wobble) * 0.4

        if (drop.y - drop.r > canvas.height + 50) {
          drop.y = -drop.r - 50
          drop.x = Math.random() * canvas.width
        }

        const gradient = ctx.createRadialGradient(
          drop.x, drop.y, 0,
          drop.x, drop.y, drop.r
        )

        if (isDark) {
          gradient.addColorStop(0, `rgba(99, 102, 241, ${drop.opacity * 1.2})`)
          gradient.addColorStop(0.4, `rgba(139, 92, 246, ${drop.opacity * 0.8})`)
          gradient.addColorStop(0.7, `rgba(59, 130, 246, ${drop.opacity * 0.4})`)
          gradient.addColorStop(1, `rgba(99, 102, 241, 0)`)
        } else {
          gradient.addColorStop(0, `rgba(79, 70, 229, ${drop.opacity * 0.8})`)
          gradient.addColorStop(0.4, `rgba(139, 92, 246, ${drop.opacity * 0.5})`)
          gradient.addColorStop(0.7, `rgba(59, 130, 246, ${drop.opacity * 0.3})`)
          gradient.addColorStop(1, `rgba(79, 70, 229, 0)`)
        }

        ctx.beginPath()
        ctx.arc(drop.x, drop.y, drop.r, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Inner glow / highlight
        const highlight = ctx.createRadialGradient(
          drop.x - drop.r * 0.25, drop.y - drop.r * 0.25, 0,
          drop.x, drop.y, drop.r * 0.6
        )
        highlight.addColorStop(0, `rgba(255, 255, 255, ${drop.opacity * 0.6})`)
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0)')

        ctx.beginPath()
        ctx.arc(drop.x, drop.y, drop.r * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = highlight
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-1] pointer-events-none"
      aria-hidden="true"
    />
  )
}
