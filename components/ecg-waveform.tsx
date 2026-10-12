"use client"

import { useEffect, useRef } from "react"
import type { RiskCategory } from "@/lib/patient-vitals"

const STROKE: Record<RiskCategory, string> = {
  Normal: "oklch(0.78 0.16 182)",
  "At-Risk": "oklch(0.76 0.14 75)",
  Critical: "oklch(0.62 0.22 18)",
}

/** One cardiac cycle sample 0..1 → amplitude -1..1 */
function ecgTemplate(phase: number): number {
  if (phase < 0.08) return 0.05 * Math.sin((phase / 0.08) * Math.PI)
  if (phase < 0.12) return 0
  if (phase < 0.14) return -0.15
  if (phase < 0.16) return 1
  if (phase < 0.18) return -0.35
  if (phase < 0.22) return 0
  if (phase < 0.35) return 0.25 * Math.sin(((phase - 0.22) / 0.13) * Math.PI)
  return 0
}

type EcgWaveformProps = {
  heartRateBpm: number
  risk: RiskCategory
  className?: string
  height?: number
}

export function EcgWaveform({
  heartRateBpm,
  risk,
  className = "",
  height = 200,
}: EcgWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<number[]>([])
  const phaseRef = useRef(0)
  const beatFlashRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    let width = 0
    let heightPx = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      heightPx = Math.max(1, Math.floor(rect.height))
      canvas.width = width * dpr
      canvas.height = heightPx * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (bufferRef.current.length === 0) {
        bufferRef.current = new Array(width).fill(0)
      } else if (bufferRef.current.length !== width) {
        const old = bufferRef.current
        bufferRef.current = new Array(width).fill(0)
        const start = Math.max(0, width - old.length)
        for (let i = 0; i < old.length && start + i < width; i++) {
          bufferRef.current[start + i] = old[i]
        }
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const samplesPerSecond = 120
    const hr = Math.max(40, Math.min(heartRateBpm, 160))
    const cycleDuration = 60 / hr
    const phasePerSample = 1 / (samplesPerSecond * cycleDuration)

    let last = performance.now()

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const samples = Math.max(1, Math.floor(dt * samplesPerSecond))
      const buf = bufferRef.current

      for (let s = 0; s < samples; s++) {
        phaseRef.current += phasePerSample
        if (phaseRef.current >= 1) {
          phaseRef.current -= 1
          beatFlashRef.current = 1
        }
        const amp = ecgTemplate(phaseRef.current)
        buf.shift()
        buf.push(amp)
      }

      beatFlashRef.current *= 0.92

      ctx.clearRect(0, 0, width, heightPx)

      ctx.strokeStyle = "oklch(0.24 0.01 260)"
      ctx.lineWidth = 1
      const gridStep = 24
      for (let x = 0; x < width; x += gridStep) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, heightPx)
        ctx.stroke()
      }
      for (let y = 0; y < heightPx; y += gridStep) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      const midY = heightPx * 0.55
      const ampScale = heightPx * 0.32

      ctx.strokeStyle = STROKE[risk]
      ctx.lineWidth = 2
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.beginPath()
      for (let i = 0; i < buf.length; i++) {
        const y = midY - buf[i] * ampScale
        if (i === 0) ctx.moveTo(i, y)
        else ctx.lineTo(i, y)
      }
      ctx.stroke()

      const sweepX = width - 2
      ctx.strokeStyle = STROKE[risk]
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      ctx.moveTo(sweepX, 0)
      ctx.lineTo(sweepX, heightPx)
      ctx.stroke()
      ctx.globalAlpha = 1

      if (beatFlashRef.current > 0.15) {
        ctx.fillStyle = STROKE[risk]
        ctx.beginPath()
        ctx.arc(12, 12, 5 + beatFlashRef.current * 4, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [heartRateBpm, risk])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-xl bg-black/40 ${className}`}
      style={{ height }}
      aria-label={`ECG waveform, heart rate ${heartRateBpm} bpm`}
    />
  )
}
