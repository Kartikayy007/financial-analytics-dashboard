import type { RiskCategory } from "@/lib/patient-vitals"
import type { PatientVitals } from "@/lib/patient-vitals"

export type RpmRole = "doctor" | "patient"

export type RpmUser = {
  id: string
  name: string
  email: string
  role: RpmRole
  patientId?: string
  doctorId?: string
}

export type RpmUserRecord = RpmUser & { password: string }

export type DoctorProfile = {
  id: string
  name: string
  email: string
  department: string
  hospital: string
  linkCode: string
}

export type PatientProfile = {
  id: string
  mrn: string
  name: string
  age: number
  bed?: string
  doctorId: string | null
  vitalSeed: PatientVitals
  streamBiasChance?: number
}

export type DeviceRecord = {
  id: string
  patientId: string
  type: string
  model: string
  battery: number
  signal: number
  gatewayOnline: boolean
  lastSyncMs: number
}

export type Medication = {
  id: string
  name: string
  dose: string
  schedule: string
}

export type CarePlan = {
  patientId: string
  medications: Medication[]
  vitalCheckTimes: string[]
  nextTelevisit: string
  notes: string
}

export type CareMessage = {
  id: string
  patientId: string
  from: "doctor" | "patient"
  body: string
  sentAt: string
}

export const DOCTOR_LINK_CODE = "VW-DS-1042"

export const DOCTOR_SHARMA: DoctorProfile = {
  id: "D-001",
  name: "Dr. Ananya Sharma",
  email: "dr.sharma@vitalwatch.in",
  department: "Cardiology & Remote Care",
  hospital: "Apollo Remote Care Centre",
  linkCode: DOCTOR_LINK_CODE,
}

const now = Date.now()

export const PATIENT_PROFILES: PatientProfile[] = [
  {
    id: "P-2026-0847",
    mrn: "2026-0847",
    name: "Priya Sharma",
    age: 54,
    bed: "Home — Ward follow-up",
    doctorId: DOCTOR_SHARMA.id,
    vitalSeed: {
      heartRate: 78,
      spo2: 98,
      systolic: 120,
      diastolic: 80,
      temperature: 37.0,
      timestamp: now,
    },
    streamBiasChance: 0.1,
  },
  {
    id: "P-2026-0912",
    mrn: "2026-0912",
    name: "Arjun Mehta",
    age: 61,
    bed: "Home monitoring",
    doctorId: DOCTOR_SHARMA.id,
    vitalSeed: {
      heartRate: 92,
      spo2: 94.5,
      systolic: 148,
      diastolic: 92,
      temperature: 37.6,
      timestamp: now,
    },
    streamBiasChance: 0.14,
  },
  {
    id: "P-2026-1033",
    mrn: "2026-1033",
    name: "Lakshmi Iyer",
    age: 67,
    bed: "Post-discharge RPM",
    doctorId: DOCTOR_SHARMA.id,
    vitalSeed: {
      heartRate: 72,
      spo2: 97,
      systolic: 128,
      diastolic: 78,
      temperature: 36.8,
      timestamp: now,
    },
    streamBiasChance: 0.06,
  },
  {
    id: "P-2026-1108",
    mrn: "2026-1108",
    name: "Rohan Kapoor",
    age: 45,
    doctorId: DOCTOR_SHARMA.id,
    vitalSeed: {
      heartRate: 68,
      spo2: 99,
      systolic: 118,
      diastolic: 76,
      temperature: 36.9,
      timestamp: now,
    },
    streamBiasChance: 0.05,
  },
  {
    id: "P-2026-1189",
    mrn: "2026-1189",
    name: "Sunita Devi",
    age: 58,
    doctorId: null,
    vitalSeed: {
      heartRate: 88,
      spo2: 96,
      systolic: 135,
      diastolic: 85,
      temperature: 37.2,
      timestamp: now,
    },
    streamBiasChance: 0.08,
  },
]

const users: RpmUserRecord[] = [
  {
    id: "U-D-001",
    name: DOCTOR_SHARMA.name,
    email: "dr.sharma@vitalwatch.in",
    password: "viva2026",
    role: "doctor",
    doctorId: DOCTOR_SHARMA.id,
  },
  {
    id: "U-P-001",
    name: "Priya Sharma",
    email: "priya.sharma@vitalwatch.in",
    password: "viva2026",
    role: "patient",
    patientId: "P-2026-0847",
  },
  {
    id: "U-P-002",
    name: "Arjun Mehta",
    email: "arjun.mehta@vitalwatch.in",
    password: "viva2026",
    role: "patient",
    patientId: "P-2026-0912",
  },
]

export const DEVICES: DeviceRecord[] = PATIENT_PROFILES.flatMap((p, i) => [
  {
    id: `DEV-W-${p.id}`,
    patientId: p.id,
    type: "Wearable",
    model: "VitalBand Pro X2",
    battery: 72 - i * 8,
    signal: 88 - i * 5,
    gatewayOnline: true,
    lastSyncMs: 8000 + i * 1200,
  },
  {
    id: `DEV-G-${p.id}`,
    patientId: p.id,
    type: "Home Gateway",
    model: "VitalHub Gateway",
    battery: 100,
    signal: 95,
    gatewayOnline: true,
    lastSyncMs: 3000 + i * 400,
  },
])

export const CARE_PLANS: CarePlan[] = [
  {
    patientId: "P-2026-0847",
    medications: [
      { id: "m1", name: "Metoprolol", dose: "25 mg", schedule: "08:00 · 20:00" },
      { id: "m2", name: "Aspirin", dose: "75 mg", schedule: "09:00" },
    ],
    vitalCheckTimes: ["08:00", "14:00", "21:00"],
    nextTelevisit: "Tomorrow, 11:30 AM",
    notes: "Daily weight log · report SpO₂ below 95%",
  },
  {
    patientId: "P-2026-0912",
    medications: [
      { id: "m3", name: "Amlodipine", dose: "5 mg", schedule: "07:30" },
      { id: "m4", name: "Atorvastatin", dose: "20 mg", schedule: "22:00" },
    ],
    vitalCheckTimes: ["07:00", "13:00", "20:00"],
    nextTelevisit: "Friday, 4:00 PM",
    notes: "Hypertension protocol — escalate BP above 160/100",
  },
  {
    patientId: "P-2026-1033",
    medications: [{ id: "m5", name: "Losartan", dose: "50 mg", schedule: "08:00" }],
    vitalCheckTimes: ["09:00", "18:00"],
    nextTelevisit: "Next Monday, 10:00 AM",
    notes: "Stable post-ICU — weekly review",
  },
  {
    patientId: "P-2026-1108",
    medications: [],
    vitalCheckTimes: ["10:00", "22:00"],
    nextTelevisit: "Bi-weekly Wednesday",
    notes: "Preventive RPM — athletic heart rate baseline",
  },
  {
    patientId: "P-2026-1189",
    medications: [{ id: "m6", name: "Metformin", dose: "500 mg", schedule: "12:00" }],
    vitalCheckTimes: ["08:00", "20:00"],
    nextTelevisit: "Pending care team link",
    notes: "Awaiting physician assignment",
  },
]

export const CARE_MESSAGES: CareMessage[] = [
  {
    id: "msg-1",
    patientId: "P-2026-0847",
    from: "doctor",
    body: "Good morning Priya — your overnight vitals look stable. Keep wearing the band during sleep.",
    sentAt: new Date(now - 86_400_000).toISOString(),
  },
  {
    id: "msg-2",
    patientId: "P-2026-0847",
    from: "patient",
    body: "Thank you, doctor. I felt slight breathlessness yesterday evening.",
    sentAt: new Date(now - 82_000_000).toISOString(),
  },
  {
    id: "msg-3",
    patientId: "P-2026-0847",
    from: "doctor",
    body: "I’ve reviewed the trend. If SpO₂ dips again, use the alert panel — I’ll follow up on tele-visit.",
    sentAt: new Date(now - 80_000_000).toISOString(),
  },
  {
    id: "msg-4",
    patientId: "P-2026-0912",
    from: "doctor",
    body: "Arjun — please take BP reading before morning medication tomorrow.",
    sentAt: new Date(now - 40_000_000).toISOString(),
  },
]

export function getUsers(): RpmUserRecord[] {
  return users
}

export function findUserByEmail(email: string): RpmUserRecord | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function toPublicUser(u: RpmUserRecord): RpmUser {
  const { password: _, ...rest } = u
  return rest
}

export function getPatientById(id: string): PatientProfile | undefined {
  return PATIENT_PROFILES.find((p) => p.id === id)
}

export function getPatientsForDoctor(doctorId: string): PatientProfile[] {
  return PATIENT_PROFILES.filter((p) => p.doctorId === doctorId)
}

export function getDoctorById(id: string): DoctorProfile | undefined {
  return id === DOCTOR_SHARMA.id ? DOCTOR_SHARMA : undefined
}

export function getCarePlan(patientId: string): CarePlan | undefined {
  return CARE_PLANS.find((c) => c.patientId === patientId)
}

export function getDevicesForPatient(patientId: string): DeviceRecord[] {
  return DEVICES.filter((d) => d.patientId === patientId)
}

export function getMessagesForPatient(patientId: string): CareMessage[] {
  return CARE_MESSAGES.filter((m) => m.patientId === patientId).sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  )
}

/** Session-local overrides for patient→doctor link */
const linkOverrides = new Map<string, string>()

export function getEffectiveDoctorId(patientId: string): string | null {
  if (linkOverrides.has(patientId)) return linkOverrides.get(patientId) ?? null
  const p = getPatientById(patientId)
  return p?.doctorId ?? null
}

export function linkPatientToDoctor(patientId: string, linkCode: string): boolean {
  if (linkCode.trim().toUpperCase() !== DOCTOR_LINK_CODE) return false
  linkOverrides.set(patientId, DOCTOR_SHARMA.id)
  const p = PATIENT_PROFILES.find((x) => x.id === patientId)
  if (p) p.doctorId = DOCTOR_SHARMA.id
  return true
}

export type RosterVitalsRow = {
  patientId: string
  risk: RiskCategory
  heartRate: number
  spo2: number
  systolic: number
  lastSyncMs: number
}