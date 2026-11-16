"use client"

import { VitalsPortal } from "@/components/cards/patient-monitoring-dashboard"
import { useRpmSession } from "@/components/rpm/session-provider"
import { userInitials } from "@/lib/rpm-auth"
import type { UsePatientVitalsOptions } from "@/hooks/use-patient-vitals"

export function PatientPortal() {
  const { session, signOut, patientProfile, assignedDoctor, linkDoctor } = useRpmSession()

  if (!session || !patientProfile) {
    return null
  }

  const vitalsOptions: UsePatientVitalsOptions = {
    initialVitals: { ...patientProfile.vitalSeed, timestamp: Date.now() },
    tickOptions: { demoBiasChance: patientProfile.streamBiasChance ?? 0.08 },
  }

  return (
    <VitalsPortal
      vitalsOptions={vitalsOptions}
      portal={{
        patient: patientProfile,
        userInitials: userInitials(session.user.name),
        userDisplayName: session.user.name,
        onLogout: signOut,
        showPatientExtras: true,
        assignedDoctor: assignedDoctor ?? undefined,
        onLinkDoctor: linkDoctor,
        viewerRole: "patient",
      }}
    />
  )
}