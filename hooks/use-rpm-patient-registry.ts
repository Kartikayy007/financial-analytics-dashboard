"use client"

import { useEffect, useState } from "react"
import {
  buildSnapshot,
  classifyRisk,
  computeDerived,
  tickVitals,
  TICK_INTERVAL_MS,
  type RiskCategory,
} from "@/lib/patient-vitals"
import {
  getPatientsForDoctor,
  type PatientProfile,
  type RosterVitalsRow,
} from "@/lib/rpm-mock-data"

type PatientSimState = {
  vitals: PatientProfile["vitalSeed"]
  hrBuffer: number[]
}

export function useRpmPatientRegistry(doctorId: string | undefined) {
  const patients = doctorId ? getPatientsForDoctor(doctorId) : []

  const [rows, setRows] = useState<RosterVitalsRow[]>(() =>
    patients.map((p) => ({
      patientId: p.id,
      risk: classifyRisk(p.vitalSeed),
      heartRate: p.vitalSeed.heartRate,
      spo2: p.vitalSeed.spo2,
      systolic: p.vitalSeed.systolic,
      lastSyncMs: 4000,
    }))
  )

  useEffect(() => {
    if (!doctorId || patients.length === 0) return

    const state = new Map<string, PatientSimState>()
    for (const p of patients) {
      state.set(p.id, {
        vitals: { ...p.vitalSeed, timestamp: Date.now() },
        hrBuffer: [p.vitalSeed.heartRate],
      })
    }

    const id = window.setInterval(() => {
      const nextRows: RosterVitalsRow[] = []
      state.forEach((sim, patientId) => {
        const profile = patients.find((x) => x.id === patientId)
        const prev = sim.vitals
        const next = tickVitals(prev, {
          demoBiasChance: profile?.streamBiasChance ?? 0.08,
        })
        sim.hrBuffer = [...sim.hrBuffer, next.heartRate].slice(-10)
        const derived = computeDerived(next, prev, sim.hrBuffer, TICK_INTERVAL_MS / 1000)
        sim.vitals = next
        const snap = buildSnapshot(next, derived)
        nextRows.push({
          patientId,
          risk: snap.risk as RiskCategory,
          heartRate: snap.heartRate,
          spo2: snap.spo2,
          systolic: snap.systolic,
          lastSyncMs: 2000 + Math.floor(Math.random() * 8000),
        })
      })
      setRows(nextRows)
    }, TICK_INTERVAL_MS)

    return () => window.clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- roster keyed by doctorId
  }, [doctorId])

  return { patients, rows }
}