"use client"

import React, { createContext, useContext } from "react"
import { usePatientVitals, type UsePatientVitalsOptions } from "@/hooks/use-patient-vitals"

type PatientVitalsContextValue = ReturnType<typeof usePatientVitals>

const PatientVitalsContext = createContext<PatientVitalsContextValue | null>(null)

export function PatientVitalsProvider({
  children,
  vitalsOptions,
}: {
  children: React.ReactNode
  vitalsOptions?: UsePatientVitalsOptions
}) {
  const value = usePatientVitals(undefined, vitalsOptions)
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
