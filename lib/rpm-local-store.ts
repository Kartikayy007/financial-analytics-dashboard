import { getMessagesForPatient, type CareMessage } from "@/lib/rpm-mock-data"

export const STORE_EVENT = "vitalwatch-store-update"
const MAX_DOC_BYTES = 1_500_000

function keys(patientId: string) {
  return {
    messages: `vw_messages_${patientId}`,
    logs: `vw_logs_${patientId}`,
    medTaken: `vw_med_taken_${patientId}`,
    meta: `vw_meta_${patientId}`,
  }
}

export type ManualVitalsLog = {
  kind: "manual_vitals"
  id: string
  patientId: string
  recordedAt: string
  heartRate?: number
  spo2?: number
  systolic?: number
  diastolic?: number
  temperature?: number
  weightKg?: number
  glucoseMgDl?: number
}

export type SymptomLog = {
  kind: "symptom"
  id: string
  patientId: string
  recordedAt: string
  text: string
  severity: number
}

export type ActivityLog = {
  kind: "activity"
  id: string
  patientId: string
  recordedAt: string
  steps?: number
  sleepHours?: number
  strain?: number
}

export type DocumentKind = "ecg_pdf" | "lab_report" | "other"

export type DocumentLog = {
  kind: "document"
  id: string
  patientId: string
  recordedAt: string
  docKind: DocumentKind
  fileName: string
  mimeType: string
  dataUrl: string
  note?: string
}

export type NoteLog = {
  kind: "note"
  id: string
  patientId: string
  recordedAt: string
  text: string
}

export type HealthLogEntry = ManualVitalsLog | SymptomLog | ActivityLog | DocumentLog | NoteLog

export type PatientStoreMeta = {
  messagesSeeded?: boolean
}

function emit() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(STORE_EVENT))
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
  emit()
}

export function ensureMessagesSeeded(patientId: string): CareMessage[] {
  const k = keys(patientId)
  const meta = readJson<PatientStoreMeta>(k.meta, {})
  let messages = readJson<CareMessage[]>(k.messages, [])

  if (!meta.messagesSeeded) {
    const seed = getMessagesForPatient(patientId)
    if (seed.length > 0 && messages.length === 0) {
      writeJson(k.messages, [...seed])
    }
    writeJson(k.meta, { ...readJson<PatientStoreMeta>(k.meta, {}), messagesSeeded: true })
  }

  return readJson<CareMessage[]>(k.messages, [])
}

export function loadMessages(patientId: string): CareMessage[] {
  if (typeof window === "undefined") return getMessagesForPatient(patientId)
  return ensureMessagesSeeded(patientId)
}

export function appendMessage(patientId: string, message: Omit<CareMessage, "id" | "patientId"> & { id?: string }) {
  const k = keys(patientId)
  ensureMessagesSeeded(patientId)
  const messages = readJson<CareMessage[]>(k.messages, [])
  const entry: CareMessage = {
    id: message.id ?? `msg-${Date.now()}`,
    patientId,
    from: message.from,
    body: message.body,
    sentAt: message.sentAt,
  }
  writeJson(k.messages, [...messages, entry])
  return entry
}

export function loadLogs(patientId: string): HealthLogEntry[] {
  const k = keys(patientId)
  return readJson<HealthLogEntry[]>(k.logs, []).sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  )
}

export function appendLog(patientId: string, entry: Omit<HealthLogEntry, "id" | "patientId"> & { id?: string }) {
  const k = keys(patientId)
  const logs = readJson<HealthLogEntry[]>(k.logs, [])
  const full = {
    ...entry,
    id: entry.id ?? `log-${Date.now()}`,
    patientId,
  } as HealthLogEntry
  writeJson(k.logs, [full, ...logs])
  return full
}

export function removeLog(patientId: string, logId: string) {
  const k = keys(patientId)
  const logs = readJson<HealthLogEntry[]>(k.logs, [])
  writeJson(
    k.logs,
    logs.filter((l) => l.id !== logId)
  )
}

export function loadMedTaken(patientId: string): Record<string, string> {
  const k = keys(patientId)
  return readJson<Record<string, string>>(k.medTaken, {})
}

export function toggleMedTaken(patientId: string, medId: string): boolean {
  const k = keys(patientId)
  const taken = readJson<Record<string, string>>(k.medTaken, {})
  if (taken[medId]) {
    delete taken[medId]
    writeJson(k.medTaken, taken)
    return false
  }
  taken[medId] = new Date().toISOString()
  writeJson(k.medTaken, taken)
  return true
}

export function isMedTaken(patientId: string, medId: string): boolean {
  return Boolean(loadMedTaken(patientId)[medId])
}

export function validateDocumentSize(dataUrl: string): { ok: boolean; error?: string } {
  const base64 = dataUrl.split(",")[1] ?? ""
  const bytes = Math.ceil((base64.length * 3) / 4)
  if (bytes > MAX_DOC_BYTES) {
    return { ok: false, error: "File is too large. Please use a file under 1.5 MB." }
  }
  return { ok: true }
}

export function countDocumentLogs(patientId: string): number {
  return loadLogs(patientId).filter((l) => l.kind === "document").length
}

export function latestManualVitals(patientId: string): ManualVitalsLog | null {
  const log = loadLogs(patientId).find((l) => l.kind === "manual_vitals")
  return log?.kind === "manual_vitals" ? log : null
}

export function logsForCharts(patientId: string) {
  const logs = loadLogs(patientId)
  return {
    manualVitals: logs.filter((l): l is ManualVitalsLog => l.kind === "manual_vitals"),
    activity: logs.filter((l): l is ActivityLog => l.kind === "activity"),
    documents: logs.filter((l): l is DocumentLog => l.kind === "document"),
  }
}

export function formatManualBp(patientId: string): string {
  const m = latestManualVitals(patientId)
  if (!m?.systolic || !m.diastolic) return "—"
  return `${m.systolic}/${m.diastolic}`
}

export function lastPatientMessagePreview(patientId: string): { body: string; sentAt: string } | null {
  const messages = loadMessages(patientId)
  const fromPatient = [...messages].reverse().find((m) => m.from === "patient")
  if (!fromPatient) return null
  return { body: fromPatient.body, sentAt: fromPatient.sentAt }
}

const SEEN_LOGS_PREFIX = "vw_doctor_seen_logs_"

export function getDoctorSeenLogCount(patientId: string): number {
  if (typeof window === "undefined") return 0
  const raw = sessionStorage.getItem(`${SEEN_LOGS_PREFIX}${patientId}`)
  return raw ? Number(raw) : 0
}

export function markDoctorSeenLogCount(patientId: string, count: number) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(`${SEEN_LOGS_PREFIX}${patientId}`, String(count))
}

export type AttentionItem = {
  patientId: string
  score: number
  reason: string
  href: string
}

export function buildAttentionQueue(
  patientIds: string[],
  risks: Record<string, string>
): AttentionItem[] {
  const items: AttentionItem[] = []
  const now = Date.now()

  for (const patientId of patientIds) {
    let score = 0
    const reasons: string[] = []
    const risk = risks[patientId] ?? "Normal"
    let href = `/doctor/patients/${encodeURIComponent(patientId)}`

    if (risk === "Critical") {
      score += 100
      reasons.push("Critical WHOOP stream")
    } else if (risk === "At-Risk") {
      score += 50
      reasons.push("At-risk vitals")
    }

    const logCount = loadLogs(patientId).length
    const seen = getDoctorSeenLogCount(patientId)
    if (logCount > seen) {
      score += 20
      reasons.push(`${logCount - seen} new health log${logCount - seen > 1 ? "s" : ""}`)
      href += "?tab=healthlog"
    }

    const docs = countDocumentLogs(patientId)
    if (docs > 0) {
      score += 8
      if (!href.includes("tab=")) href += "?tab=healthlog"
    }

    const msg = lastPatientMessagePreview(patientId)
    if (msg) {
      const age = now - new Date(msg.sentAt).getTime()
      if (age < 48 * 3_600_000) {
        score += 10
        const h = Math.max(1, Math.round(age / 3_600_000))
        reasons.push(`Patient messaged ${h}h ago`)
        if (!href.includes("tab=")) href += "?tab=messages"
      }
    }

    if (score > 0) {
      items.push({
        patientId,
        score,
        reason: reasons[0] ?? "Review patient",
        href,
      })
    }
  }

  return items.sort((a, b) => b.score - a.score).slice(0, 5)
}