"use client"

import { use } from "react"
import { DoctorPatientDetail } from "@/components/rpm/doctor-patient-detail"
import { RoleGuard } from "@/components/rpm/role-guard"

export default function DoctorPatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <RoleGuard role="doctor">
      <DoctorPatientDetail patientId={id} />
    </RoleGuard>
  )
}