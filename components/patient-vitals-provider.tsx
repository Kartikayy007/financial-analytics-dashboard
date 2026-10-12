"use client"

import React, { createContext, useContext } from "react"
import { usePatientVitals } from "@/hooks/use-patient-vitals"

type PatientVitalsContextValue = ReturnType<typeof usePatientVitals>

const PatientVitalsContext = createContext<PatientVitalsContextValue | null>(null)

export function PatientVitalsProvider({ children }: { children: React.ReactNode }) {
  const value = usePatientVitals()
  return (
    <PatientVitalsContext.Provider value={value}>{children}</PatientVitalsContext.Provider>
  )
}

export function usePatientVitalsContext() {
  const ctx = useContext(PatientVitalsContext)
  if (!ctx) {
    throw new Error("usePatientVitalsContext must be used within PatientVitalsProvider")
  }
  return ctx
}
