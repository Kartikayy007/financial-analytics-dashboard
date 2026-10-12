import type { RiskCategory } from "@/lib/patient-vitals"

export type UserRole = "nurse" | "patient" | "admin"

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
  patientId?: string
}

export type UserRecord = User & { password: string }

export type VitalReading = {
  id: string
  patientId: string
  heartRate: number
  spo2: number
  systolic: number
  diastolic: number
  temperature: number
  risk?: RiskCategory
  recordedAt: string
  recordedBy?: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  token: string
  user: User
}

export type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
}

export type CreateUserRequest = {
  name: string
  email: string
  password: string
  role: UserRole
  patientId?: string
}

export type CreateVitalRequest = {
  patientId: string
  heartRate: number
  spo2: number
  systolic: number
  diastolic: number
  temperature: number
  recordedBy?: string
}

export type VitalsListResponse = {
  patientId: string
  latest: VitalReading | null
  readings: VitalReading[]
}

export type AiAnalyzeRequest = {
  patientId?: string
  vitals?: {
    heartRate: number
    spo2: number
    systolic: number
    diastolic: number
    temperature: number
    risk?: RiskCategory
  }
}

export type AiAnalyzeResponse = {
  summary: string
  bullets: string[]
  riskCategory: RiskCategory
  disclaimer: string
}

export type AiChatRequest = {
  message: string
  patientId?: string
}

export type AiChatResponse = {
  reply: string
}
