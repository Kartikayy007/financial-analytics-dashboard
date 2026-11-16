"use client"

import { useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { VitalsPortal } from "@/components/cards/patient-monitoring-dashboard"
import { useRpmSession } from "@/components/rpm/session-provider"
import { userInitials } from "@/lib/rpm-auth"
import { getPatientById } from "@/lib/rpm-mock-data"
import { markDoctorSeenLogCount, loadLogs } from "@/lib/rpm-local-store"
import type { UsePatientVitalsOptions } from "@/hooks/use-patient-vitals"
import Link from "next/link"

const TAB_KEYS = ["monitor", "trends", "healthlog", "alerts", "settings", "careplan", "mydoctor", "devices", "messages"] as const

type TabKey = (typeof TAB_KEYS)[number]

function tabFromQuery(raw: string | null): TabKey | undefined {
  if (!raw) return undefined
  return TAB_KEYS.includes(raw as TabKey) ? (raw as TabKey) : undefined
}

export function DoctorPatientDetail({ patientId }: { patientId: string }) {
  const searchParams = useSearchParams()
  const { session, signOut } = useRpmSession()
  const patient = getPatientById(patientId)
  const initialSection = useMemo(() => tabFromQuery(searchParams.get("tab")), [searchParams])

  useEffect(() => {
    if (patient) markDoctorSeenLogCount(patientId, loadLogs(patientId).length)
  }, [patientId, patient])

  if (!session || !patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Patient not found.</p>
        <Link href="/doctor" className="text-primary hover:underline">
          Back to roster
        </Link>
      </div>
    )
  }

  const vitalsOptions: UsePatientVitalsOptions = {
    initialVitals: { ...patient.vitalSeed, timestamp: Date.now() },
    tickOptions: { demoBiasChance: patient.streamBiasChance ?? 0.08 },
  }

  return (
    <VitalsPortal
      vitalsOptions={vitalsOptions}
      portal={{
        patient,
        userInitials: userInitials(session.user.name),
        userDisplayName: session.user.name,
        onLogout: signOut,
        showPatientExtras: true,
        viewerRole: "doctor",
        backHref: "/doctor",
        backLabel: "Roster",
        initialSection,
      }}
    />
  )
}