"use client"

import { VitalsPortal } from "@/components/cards/patient-monitoring-dashboard"
import { useRpmSession } from "@/components/rpm/session-provider"
import { userInitials } from "@/lib/rpm-auth"
import { getPatientById } from "@/lib/rpm-mock-data"
import type { UsePatientVitalsOptions } from "@/hooks/use-patient-vitals"
import Link from "next/link"

export function DoctorPatientDetail({ patientId }: { patientId: string }) {
  const { session, signOut } = useRpmSession()
  const patient = getPatientById(patientId)

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
      }}
    />
  )
}