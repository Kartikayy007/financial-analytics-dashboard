"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  clearSession,
  homePathForRole,
  persistSession,
  readSession,
  type RpmSession,
} from "@/lib/rpm-auth"
import {
  getDoctorById,
  getEffectiveDoctorId,
  getPatientById,
  getPatientsForDoctor,
  linkPatientToDoctor,
  type DoctorProfile,
  type PatientProfile,
} from "@/lib/rpm-mock-data"

type RpmSessionContextValue = {
  session: RpmSession | null
  loading: boolean
  signIn: (session: RpmSession) => void
  signOut: () => void
  assignedDoctor: DoctorProfile | null
  patientProfile: PatientProfile | null
  linkedPatients: PatientProfile[]
  linkDoctor: (code: string) => boolean
  refreshSession: () => void
}

const RpmSessionContext = createContext<RpmSessionContextValue | null>(null)

export function RpmSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<RpmSession | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(() => {
    setSession(readSession())
  }, [])

  useEffect(() => {
    refreshSession()
    setLoading(false)
  }, [refreshSession])

  const patientProfile = useMemo(() => {
    if (!session?.user.patientId) return null
    return getPatientById(session.user.patientId) ?? null
  }, [session])

  const [linkRevision, setLinkRevision] = useState(0)

  const assignedDoctor = useMemo(() => {
    if (!session?.user.patientId) {
      if (session?.user.doctorId) return getDoctorById(session.user.doctorId) ?? null
      return null
    }
    const docId = getEffectiveDoctorId(session.user.patientId)
    return docId ? getDoctorById(docId) ?? null : null
  }, [session, linkRevision])

  const linkedPatients = useMemo(() => {
    if (!session?.user.doctorId) return []
    return getPatientsForDoctor(session.user.doctorId)
  }, [session])

  const signIn = useCallback(
    (next: RpmSession) => {
      persistSession(next)
      setSession(next)
      router.push(homePathForRole(next.user.role))
    },
    [router]
  )

  const signOut = useCallback(() => {
    clearSession()
    setSession(null)
    router.push("/login")
  }, [router])

  const linkDoctor = useCallback(
    (code: string) => {
      if (!session?.user.patientId) return false
      const ok = linkPatientToDoctor(session.user.patientId, code)
      if (ok) setLinkRevision((n) => n + 1)
      return ok
    },
    [session]
  )

  const value: RpmSessionContextValue = {
    session,
    loading,
    signIn,
    signOut,
    assignedDoctor,
    patientProfile,
    linkedPatients,
    linkDoctor,
    refreshSession,
  }

  return <RpmSessionContext.Provider value={value}>{children}</RpmSessionContext.Provider>
}

export function useRpmSession() {
  const ctx = useContext(RpmSessionContext)
  if (!ctx) throw new Error("useRpmSession must be used within RpmSessionProvider")
  return ctx
}