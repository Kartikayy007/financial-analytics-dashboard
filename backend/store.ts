import { classifyRisk } from "@/lib/patient-vitals"
import type { CreateUserRequest, CreateVitalRequest, User, UserRecord, VitalReading } from "./types"

const DEMO_PATIENT_ID = "P-2026-0847"

let userIdSeq = 3
let vitalIdSeq = 4
let tokenSeq = 1

const users: UserRecord[] = [
  {
    id: "U-001",
    name: "Riya Nair",
    email: "nurse@vitalwatch.demo",
    password: "demo123",
    role: "nurse",
  },
  {
    id: "U-002",
    name: "Priya Sharma",
    email: "patient@vitalwatch.demo",
    password: "demo123",
    role: "patient",
    patientId: DEMO_PATIENT_ID,
  },
]

const vitals: VitalReading[] = [
  {
    id: "V-001",
    patientId: DEMO_PATIENT_ID,
    heartRate: 78,
    spo2: 98,
    systolic: 120,
    diastolic: 80,
    temperature: 37.0,
    risk: "Normal",
    recordedAt: new Date(Date.now() - 120_000).toISOString(),
    recordedBy: "U-001",
  },
  {
    id: "V-002",
    patientId: DEMO_PATIENT_ID,
    heartRate: 82,
    spo2: 97.5,
    systolic: 118,
    diastolic: 78,
    temperature: 37.1,
    risk: "Normal",
    recordedAt: new Date(Date.now() - 60_000).toISOString(),
    recordedBy: "U-001",
  },
  {
    id: "V-003",
    patientId: DEMO_PATIENT_ID,
    heartRate: 76,
    spo2: 98.2,
    systolic: 122,
    diastolic: 81,
    temperature: 36.9,
    risk: "Normal",
    recordedAt: new Date().toISOString(),
    recordedBy: "U-001",
  },
]

const validTokens = new Set<string>()

function toPublicUser(u: UserRecord): User {
  const { password: _, ...rest } = u
  return rest
}

export function getDemoPatientId() {
  return DEMO_PATIENT_ID
}

export function listUsers(): User[] {
  return users.map(toPublicUser)
}

export function getUserById(id: string): User | undefined {
  const u = users.find((x) => x.id === id)
  return u ? toPublicUser(u) : undefined
}

export function getUserByEmail(email: string): UserRecord | undefined {
  return users.find((x) => x.email.toLowerCase() === email.toLowerCase())
}

export function createUser(body: CreateUserRequest): User {
  if (users.some((x) => x.email.toLowerCase() === body.email.toLowerCase())) {
    throw new Error("Email already registered")
  }
  const record: UserRecord = {
    id: `U-${String(userIdSeq++).padStart(3, "0")}`,
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role,
    patientId: body.patientId,
  }
  users.push(record)
  return toPublicUser(record)
}

export function issueToken(userId: string): string {
  const token = `wip-token-${userId}-${tokenSeq++}`
  validTokens.add(token)
  return token
}

export function isTokenValid(token: string | null | undefined): boolean {
  if (!token) return false
  return validTokens.has(token)
}

export function getVitalsByPatient(patientId: string): VitalReading[] {
  return vitals
    .filter((v) => v.patientId === patientId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
}

export function addVitalReading(body: CreateVitalRequest): VitalReading {
  const risk = classifyRisk({
    heartRate: body.heartRate,
    spo2: body.spo2,
    systolic: body.systolic,
    diastolic: body.diastolic,
    temperature: body.temperature,
    timestamp: Date.now(),
  })
  const reading: VitalReading = {
    id: `V-${String(vitalIdSeq++).padStart(3, "0")}`,
    patientId: body.patientId,
    heartRate: body.heartRate,
    spo2: body.spo2,
    systolic: body.systolic,
    diastolic: body.diastolic,
    temperature: body.temperature,
    risk,
    recordedAt: new Date().toISOString(),
    recordedBy: body.recordedBy,
  }
  vitals.push(reading)
  return reading
}
