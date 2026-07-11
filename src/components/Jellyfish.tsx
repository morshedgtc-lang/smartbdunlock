'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

interface Jelly {
  x: number
  y: number
  size: number
  speed: number
  phase: number
  phaseSpeed: number
  rotY: number
  rotSpeed: number
  driftX: number
  driftY: number
  driftPhase: number
  driftSpeed: number
  hue: number
  opacity: number
  tentPhase: number
}

export function Jellyfish() {
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
    const w = () => canvas.width
    const h = () => canvas.height

    const jellies: Jelly[] = [
      { x: w() * 0.2, y: h() * 0.35, size: 55, speed: 0.4, phase: 0, phaseSpeed: 0.02, rotY: 0, rotSpeed: 0.008, driftX: 0, driftY: 0, driftPhase: 0, driftSpeed: 0.006, hue: 250, opacity: 0.35, tentPhase: 0 },
      { x: w() * 0.75, y: h() * 0.25, size: 35, speed: 0.3, phase: 1, phaseSpeed: 0.025, rotY: 0, rotSpeed: 0.01, driftX: 0, driftY: 0, driftPhase: 1.5, driftSpeed: 0.005, hue: 220, opacity: 0.3, tentPhase: 0.5 },
      { x: w() * 0.35, y: h() * 0.7, size: 45, speed: 0.35, phase: 2, phaseSpeed: 0.018, rotY: 0, rotSpeed: 0.007, driftX: 0, driftY: 0, driftPhase: 3, driftSpeed: 0.007, hue: 270, opacity: 0.32, tentPhase: 1 },
      { x: w() * 0.5, y: h() * 0.45, size: 70, speed: 0.25, phase: 0.5, phaseSpeed: 0.015, rotY: 0, rotSpeed: 0.005, driftX: 0, driftY: 0, driftPhase: 0.8, driftSpeed: 0.004, hue: 240, opacity: 0.4, tentPhase: 0.3 },
      { x: w() * 0.85, y: h() * 0.65, size: 30, speed: 0.45, phase: 3, phaseSpeed: 0.03, rotY: 0, rotSpeed: 0.012, driftX: 0, driftY: 0, driftPhase: 2, driftSpeed: 0.008, hue: 200, opacity: 0.25, tentPhase: 2 },
      { x: w() * 0.15, y: h() * 0.75, size: 25, speed: 0.5, phase: 4, phaseSpeed: 0.022, rotY: 0, rotSpeed: 0.009, driftX: 0, driftY: 0, driftPhase: 4, driftSpeed: 0.006, hue: 260, opacity: 0.22, tentPhase: 3 },
      { x: w() * 0.65, y: h() * 0.8, size: 40, speed: 0.32, phase: 1.5, phaseSpeed: 0.02, rotY: 0, rotSpeed: 0.006, driftX: 0, driftY: 0, driftPhase: 2.5, driftSpeed: 0.005, hue: 230, opacity: 0.28, tentPhase: 1.5 },
      { x: w() * 0.9, y: h() * 0.15, size: 20, speed: 0.55, phase: 5, phaseSpeed: 0.028, rotY: 0, rotSpeed: 0.011, driftX: 0, driftY: 0, driftPhase: 5, driftSpeed: 0.009, hue: 280, opacity: 0.2, tentPhase: 4 },
    ]

    const drawBell = (j: Jelly, bellWidth: number, bellHeight: number) => {
      const c = ctx!

      // Glow
      const glow = c.createRadialGradient(0, 0, 0, 0, 0, bellWidth * 1.2)
      glow.addColorStop(0, `hsla(${j.hue}, 80%, 65%, ${j.opacity * 0.4})`)
      glow.addColorStop(0.5, `hsla(${j.hue}, 70%, 55%, ${j.opacity * 0.15})`)
      glow.addColorStop(1, `hsla(${j.hue}, 60%, 50%, 0)`)
      c.fillStyle = glow
      c.beginPath()
      c.ellipse(0, 0, bellWidth * 1.2, bellHeight * 1.2, 0, 0, Math.PI * 2)
      c.fill()

      // Bell body
      const bellGrad = c.createRadialGradient(-bellWidth * 0.2, -bellHeight * 0.2, 0, 0, 0, bellWidth)
      bellGrad.addColorStop(0, `hsla(${j.hue + 20}, 80%, 75%, ${j.opacity * 0.9})`)
      bellGrad.addColorStop(0.5, `hsla(${j.hue}, 70%, 60%, ${j.opacity * 0.7})`)
      bellGrad.addColorStop(1, `hsla(${j.hue - 10}, 60%, 45%, ${j.opacity * 0.4})`)

      // 3D rotation effect — squish bell based on rotY
      const squish = Math.cos(j.rotY)
      const bellSquish = 0.6 + Math.abs(squish) * 0.4

      c.save()
      c.scale(bellSquish, 1)
      c.beginPath()
      c.ellipse(0, 0, bellWidth, bellHeight, 0, 0, Math.PI * 2)
      c.fillStyle = bellGrad
      c.fill()

      // Bell edge highlight
      c.strokeStyle = `hsla(${j.hue + 30}, 90%, 80%, ${j.opacity * 0.5})`
      c.lineWidth = 1.5
      c.stroke()
      c.restore()

      // Glass highlight
      c.save()
      c.scale(bellSquish, 1)
      const hl = c.createRadialGradient(-bellWidth * 0.3, -bellHeight * 0.3, 0, -bellWidth * 0.1, -bellHeight * 0.1, bellWidth * 0.6)
      hl.addColorStop(0, `rgba(255, 255, 255, ${j.opacity * 0.6})`)
      hl.addColorStop(1, 'rgba(255, 255, 255, 0)')
      c.fillStyle = hl
      c.beginPath()
      c.ellipse(-bellWidth * 0.15, -bellHeight * 0.2, bellWidth * 0.5, bellHeight * 0.35, -0.3, 0, Math.PI * 2)
      c.fill()
      c.restore()

      // Dots around bell
      const dotCount = 12
      for (let d = 0; d < dotCount; d++) {
        const angle = (Math.PI * 2 / dotCount) * d + j.phase
        const dx = Math.cos(angle) * bellWidth * 0.85 * bellSquish
        const dy = Math.sin(angle) * bellHeight * 0.7
        const pulse = 0.5 + Math.sin(j.phase * 3 + d) * 0.5
        const dotR = 2 + pulse * 2

        c.beginPath()
        c.arc(dx, dy, dotR, 0, Math.PI * 2)
        c.fillStyle = `hsla(${j.hue + d * 5}, 90%, 70%, ${(0.3 + pulse * 0.4) * j.opacity})`
        c.fill()

        // Dot glow
        c.beginPath()
        c.arc(dx, dy, dotR + 3, 0, Math.PI * 2)
        c.fillStyle = `hsla(${j.hue + d * 5}, 80%, 65%, ${pulse * 0.15 * j.opacity})`
        c.fill()
      }
    }

    const drawTentacles = (j: Jelly, bellHeight: number) => {
      const c = ctx!
      const tentCount = 6
      const tentLen = j.size * 1.8

      for (let t = 0; t < tentCount; t++) {
        const baseX = (t - (tentCount - 1) / 2) * (j.size * 0.2)
        const wave = Math.sin(j.tentPhase + t * 0.8) * 15
        const endX = baseX + wave + Math.sin(j.tentPhase * 0.7 + t) * 10
        const endY = bellHeight + tentLen

        const grad = c.createLinearGradient(baseX, bellHeight * 0.5, endX, endY)
        grad.addColorStop(0, `hsla(${j.hue + 10}, 80%, 65%, ${j.opacity * 0.6})`)
        grad.addColorStop(0.4, `hsla(${j.hue}, 70%, 55%, ${j.opacity * 0.35})`)
        grad.addColorStop(1, `hsla(${j.hue - 10}, 60%, 50%, 0)`)

        c.beginPath()
        c.moveTo(baseX, bellHeight * 0.5)
        c.bezierCurveTo(
          baseX + wave * 0.3, bellHeight + tentLen * 0.3,
          endX - wave * 0.5, bellHeight + tentLen * 0.6,
          endX, endY
        )
        c.strokeStyle = grad
        c.lineWidth = 2 + Math.sin(j.tentPhase + t) * 0.5
        c.lineCap = 'round'
        c.stroke()

        // Tentacle dot at tip
        const tipPulse = 0.4 + Math.sin(j.tentPhase * 2 + t * 1.2) * 0.6
        c.beginPath()
        c.arc(endX, endY, 2 + tipPulse * 2, 0, Math.PI * 2)
        c.fillStyle = `hsla(${j.hue + 20}, 90%, 75%, ${(0.2 + tipPulse * 0.3) * j.opacity})`
        c.fill()
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, w(), h())

      for (const j of jellies) {
        // Drift
        j.driftPhase += j.driftSpeed
        j.x += Math.sin(j.driftPhase) * 0.6
        j.y += Math.cos(j.driftPhase * 0.7) * 0.4 - j.speed * 0.3

        // Reset if off screen
        if (j.y < -j.size * 3) {
          j.y = h() + j.size * 2
          j.x = Math.random() * w()
        }

        // Animation phases
        j.phase += j.phaseSpeed
        j.rotY += j.rotSpeed
        j.tentPhase += 0.025

        const bellWidth = j.size
        const bellHeight = j.size * 0.55

        ctx.save()
        ctx.translate(j.x, j.y)

        drawTentacles(j, bellHeight)
        drawBell(j, bellWidth, bellHeight)

        ctx.restore()
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
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ contain: 'strict' }}
      aria-hidden="true"
    />
  )
}
