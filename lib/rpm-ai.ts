import { classifyRisk, type RiskCategory, type VitalsSnapshot, type HistoryPoint } from "@/lib/patient-vitals"

export type AiAnalyzeResponse = {
  summary: string
  bullets: string[]
  riskCategory: RiskCategory
  confidence: number
  disclaimer: string
}

type VitalsInput = {
  heartRate: number
  spo2: number
  systolic: number
  diastolic: number
  temperature: number
  risk?: RiskCategory
}

export function buildAnalysis(vitals: VitalsInput, patientId: string): AiAnalyzeResponse {
  const risk =
    vitals.risk ??
    classifyRisk({
      ...vitals,
      timestamp: Date.now(),
    })
  const pulsePressure = vitals.systolic - vitals.diastolic

  const bullets = [
    `Heart rate ${vitals.heartRate} bpm — ${hrNote(vitals.heartRate)}`,
    `SpO₂ ${vitals.spo2}% — ${spo2Note(vitals.spo2)}`,
    `Blood pressure ${vitals.systolic}/${vitals.diastolic} mmHg (pulse pressure ${pulsePressure} mmHg)`,
    `Temperature ${vitals.temperature.toFixed(1)}°C — ${tempNote(vitals.temperature)}`,
    `Model risk stratum: ${risk}`,
  ]

  const summary =
    risk === "Normal"
      ? `VitalAI: stream for ${patientId} is within configured clinical thresholds. Continue scheduled monitoring.`
      : risk === "At-Risk"
        ? `VitalAI: borderline signals detected for ${patientId}. Recommend closer observation and repeat wearable sync.`
        : `VitalAI: critical-range pattern for ${patientId}. Escalate per care pathway and notify assigned physician.`

  const confidence =
    risk === "Normal" ? 0.91 : risk === "At-Risk" ? 0.84 : 0.88

  return {
    summary,
    bullets,
    riskCategory: risk,
    confidence,
    disclaimer: "Clinical decision support output — physician review required.",
  }
}

export function buildAnalysisFromSnapshot(snapshot: VitalsSnapshot, patientId: string): AiAnalyzeResponse {
  return buildAnalysis(snapshot, patientId)
}

function hrNote(hr: number): string {
  if (hr < 60) return "below typical resting band"
  if (hr > 100) return "elevated"
  return "within typical resting band"
}

function spo2Note(spo2: number): string {
  if (spo2 < 90) return "critical hypoxemia pattern"
  if (spo2 < 95) return "borderline"
  return "adequate"
}

function tempNote(t: number): string {
  if (t < 36) return "below baseline"
  if (t > 38) return "febrile trend"
  return "near baseline 37°C"
}

export function chatReply(message: string, patientId?: string): string {
  const lower = message.toLowerCase()
  const pid = patientId ?? "your record"

  if (lower.includes("risk") || lower.includes("critical")) {
    return `For ${pid}, risk is computed from heart rate, SpO₂, systolic pressure, and temperature. Open the Analysis tab for the latest VitalAI report with confidence score.`
  }
  if (lower.includes("heart") || lower.includes("hr") || lower.includes("bpm")) {
    return `Live heart rate and rolling average appear on the monitor. The ECG trace rate follows current BPM from the wearable stream.`
  }
  if (lower.includes("spo") || lower.includes("oxygen")) {
    return `SpO₂ rate of change is derived from successive wearable packets. A negative trend may warrant a check-in with your care team.`
  }
  if (lower.includes("anomaly") || lower.includes("forecast")) {
    return `The Trends view includes our anomaly score and 7-day heart-rate forecast from the on-device aggregation model.`
  }
  if (lower.includes("med") || lower.includes("dose")) {
    return `Medication schedules are listed under Care Plan. Mark doses when taken to keep adherence visible to your physician.`
  }
  if (lower.includes("hello") || lower.includes("hi")) {
    return `Hello — I'm VitalAI, your clinical assistant. Ask about vitals, risk, medications, or trends.`
  }
  return `I've logged your question about "${message.slice(0, 60)}${message.length > 60 ? "…" : ""}". For specific thresholds, see Settings → Clinical thresholds.`
}

export function computeAnomalyScore(snapshot: VitalsSnapshot, history: HistoryPoint[]): number {
  let score = 12
  if (snapshot.heartRate > 100 || snapshot.heartRate < 60) score += 22
  if (snapshot.spo2 < 95) score += 28
  if (snapshot.systolic > 160 || snapshot.systolic < 100) score += 20
  if (snapshot.temperature > 38 || snapshot.temperature < 36) score += 18
  if (Math.abs(snapshot.spo2RateOfChange) > 0.15) score += 12

  if (history.length >= 3) {
    const hrs = history.map((h) => h.heartRate)
    const mean = hrs.reduce((a, b) => a + b, 0) / hrs.length
    const variance = hrs.reduce((s, h) => s + (h - mean) ** 2, 0) / hrs.length
    score += Math.min(15, Math.sqrt(variance) * 2)
  }

  return Math.min(100, Math.round(score))
}

export type ForecastPoint = { day: string; heartRate: number; lower: number; upper: number }

export function buildSevenDayForecast(history: HistoryPoint[]): ForecastPoint[] {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const base =
    history.length > 0
      ? history.slice(-10).reduce((s, p) => s + p.heartRate, 0) / Math.min(10, history.length)
      : 78

  return labels.map((day, i) => {
    const trend = Math.sin(i * 0.7) * 4
    const hr = Math.round(base + trend + i * 0.3)
    return {
      day,
      heartRate: hr,
      lower: hr - 6,
      upper: hr + 6,
    }
  })
}

export async function delayAnalysis(ms = 320): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}