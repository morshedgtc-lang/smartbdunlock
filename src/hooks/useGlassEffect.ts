'use client'

import { useRef, useCallback, useEffect } from 'react'

interface GlassEffectOptions {
  enableTilt?: boolean
  enableDistortion?: boolean
  enableGlow?: boolean
  intensity?: number
}

interface GlassEffectReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  glowRef: React.RefObject<HTMLDivElement | null>
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void
    onMouseLeave: () => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

export function useGlassEffect(options: GlassEffectOptions = {}): GlassEffectReturn {
  const {
    enableTilt = true,
    enableDistortion = true,
    enableGlow = true,
    intensity = 1
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const isMobileRef = useRef(false)

  useEffect(() => {
    isMobileRef.current = window.innerWidth < 768 || 'ontouchstart' in window
  }, [])

  const updateSVGFilters = useCallback((x: number, y: number, distance: number) => {
    if (!enableDistortion || isMobileRef.current) return

    const turbulence = document.getElementById('dynamicTurbulence') as (SVGElement & { setAttribute: (n: string, v: string) => void }) | null
    const displacement = document.getElementById('dynamicDisplacement') as (SVGElement & { setAttribute: (n: string, v: string) => void }) | null
    const blur = document.getElementById('dynamicBlur') as (SVGElement & { setAttribute: (n: string, v: string) => void }) | null
    const light = document.getElementById('specularLight') as (SVGElement & { setAttribute: (n: string, v: string) => void }) | null

    if (turbulence) {
      const baseFreq = 0.008 + (x * 0.008) + (y * 0.008)
      turbulence.setAttribute('baseFrequency', `${Math.min(0.028, Math.max(0.008, baseFreq))}`)
    }

    if (displacement) {
      const scale = Math.min(18, distance * 0.15 * intensity)
      displacement.setAttribute('scale', String(scale))
    }

    if (blur) {
      const stdDev = 0.3 + (distance * 0.008 * intensity)
      blur.setAttribute('stdDeviation', String(Math.min(1.3, stdDev)))
    }

    if (light) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        light.setAttribute('x', String(x * rect.width))
        light.setAttribute('y', String(y * rect.height))
        light.setAttribute('z', String(150 + distance * 0.8))
      }
    }
  }, [enableDistortion, intensity])

  const resetSVGFilters = useCallback(() => {
    if (!enableDistortion) return

    const turbulence = document.getElementById('dynamicTurbulence')
    const displacement = document.getElementById('dynamicDisplacement')
    const blur = document.getElementById('dynamicBlur')
    const light = document.getElementById('specularLight')

    if (turbulence) turbulence.setAttribute('baseFrequency', '0.015')
    if (displacement) displacement.setAttribute('scale', '0')
    if (blur) blur.setAttribute('stdDeviation', '0.5')
    if (light) {
      light.setAttribute('x', '200')
      light.setAttribute('y', '200')
      light.setAttribute('z', '250')
    }
  }, [enableDistortion])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const centerX = x - 0.5
    const centerY = y - 0.5
    const distance = Math.sqrt(centerX * centerX + centerY * centerY)

    cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        if (enableGlow && glowRef.current) {
          glowRef.current.style.opacity = '1'
          glowRef.current.style.left = `${x * 100}%`
          glowRef.current.style.top = `${y * 100}%`
        }

        updateSVGFilters(x, y, distance)
      }
    })
  }, [enableGlow, intensity, updateSVGFilters])

  const handleMouseLeave = useCallback(() => {
    if (glowRef.current) {
      glowRef.current.style.opacity = '0'
    }

    resetSVGFilters()
  }, [resetSVGFilters])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || !isMobileRef.current) return

    const touch = e.touches[0]
    const rect = containerRef.current.getBoundingClientRect()
    const x = (touch.clientX - rect.left) / rect.width
    const y = (touch.clientY - rect.top) / rect.height

    if (enableGlow && glowRef.current) {
      glowRef.current.style.opacity = '0.6'
      glowRef.current.style.left = `${x * 100}%`
      glowRef.current.style.top = `${y * 100}%`
    }
  }, [enableGlow])

  const handleTouchEnd = useCallback(() => {
    if (glowRef.current) {
      glowRef.current.style.opacity = '0'
    }
  }, [])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return {
    containerRef,
    glowRef,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
