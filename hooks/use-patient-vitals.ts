"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  buildSnapshot,
  computeDerived,
  createInitialVitals,
  HR_ROLLING_WINDOW,
  HistoryPoint,
  PatientVitals,
  RiskCategory,
  TICK_INTERVAL_MS,
  tickVitals,
  toHistoryPoint,
  VitalsSnapshot,
  type TickOptions,
} from "@/lib/patient-vitals"

export type UsePatientVitalsOptions = {
  initialVitals?: PatientVitals
  tickOptions?: TickOptions
}

const MAX_HISTORY = 60

export type VitalsAlert = {
  id: number
  type: "warning" | "info" | "success"
  title: string
  message: string
  time: string
  read: boolean
}

function formatTimeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  return `${min} min ago`
}

export function usePatientVitals(
  intervalMs = TICK_INTERVAL_MS,
  options: UsePatientVitalsOptions = {}
) {
  const initial = options.initialVitals ?? createInitialVitals()
  const tickOptions = options.tickOptions

  const [snapshot, setSnapshot] = useState<VitalsSnapshot>(() => {
    const derived = computeDerived(initial, null, [initial.heartRate], intervalMs / 1000)
    return buildSnapshot(initial, derived)
  })
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [alerts, setAlerts] = useState<VitalsAlert[]>([
    {
      id: 1,
      type: "success",
      title: "Wearable connected",
      message: "Vitals stream active from home gateway",
      time: "just now",
      read: false,
    },
  ])

  const prevVitalsRef = useRef<PatientVitals>(initial)
  const hrBufferRef = useRef<number[]>([snapshot.heartRate])
  const lastRiskRef = useRef<RiskCategory>(snapshot.risk)
  const alertIdRef = useRef(2)

  const pushAlert = useCallback((risk: RiskCategory, vitals: VitalsSnapshot) => {
    if (risk === "Normal") return
    const id = alertIdRef.current++
    const type = risk === "Critical" ? "warning" : "info"
    setAlerts((prev) => [
      {
        id,
        type,
        title: risk === "Critical" ? "Critical vitals" : "At-risk vitals",
        message: `HR ${vitals.heartRate} bpm · SpO₂ ${vitals.spo2}% · BP ${vitals.systolic}/${vitals.diastolic} · ${vitals.temperature}°C`,
        time: formatTimeAgo(vitals.timestamp),
        read: false,
      },
      ...prev.slice(0, 19),
    ])
  }, [])

  useEffect(() => {
    const tick = () => {
      const prev = prevVitalsRef.current
      const next = tickVitals(prev, tickOptions ?? {})
      const deltaSeconds = intervalMs / 1000

      hrBufferRef.current = [...hrBufferRef.current, next.heartRate].slice(-HR_ROLLING_WINDOW)
      const derived = computeDerived(next, prev, hrBufferRef.current, deltaSeconds)
      const full = buildSnapshot(next, derived)

      prevVitalsRef.current = next

      if (full.risk !== lastRiskRef.current && full.risk !== "Normal") {
        pushAlert(full.risk, full)
      }
      lastRiskRef.current = full.risk

      setSnapshot(full)
      setHistory((h) => {
        const point = toHistoryPoint(full, h.length)
        const nextHistory = [...h, point].slice(-MAX_HISTORY)
        return nextHistory.map((p, i) => ({
          ...p,
          time: i === nextHistory.length - 1 ? point.time : `${i}`,
        }))
      })

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === 1 ? { ...a, time: formatTimeAgo(Date.now() - 5000) } : a
        )
      )
    }

    const id = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, pushAlert])

  const markAlertRead = useCallback((id: number) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
  }, [])

  const markAllAlertsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
  }, [])

  return {
    snapshot,
    history,
    alerts,
    lastUpdated: snapshot.timestamp,
    markAlertRead,
    markAllAlertsRead,
  }
}
