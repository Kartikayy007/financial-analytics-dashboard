"use client"

import { DoctorDashboard } from "@/components/rpm/doctor-dashboard"
import { RoleGuard } from "@/components/rpm/role-guard"

export default function DoctorHomePage() {
  return (
    <RoleGuard role="doctor">
      <DoctorDashboard />
    </RoleGuard>
  )
}