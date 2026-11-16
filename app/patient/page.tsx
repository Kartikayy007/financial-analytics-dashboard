"use client"

import { PatientPortal } from "@/components/rpm/patient-portal"
import { RoleGuard } from "@/components/rpm/role-guard"

export default function PatientHomePage() {
  return (
    <RoleGuard role="patient">
      <PatientPortal />
    </RoleGuard>
  )
}