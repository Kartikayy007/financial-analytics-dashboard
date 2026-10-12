import { classifyRisk, type RiskCategory } from "@/lib/patient-vitals"
import type { AiAnalyzeResponse, VitalReading } from "./types"

type VitalsInput = {
  heartRate: number
  spo2: number
  systolic: number
  diastolic: number
  temperature: number
  risk?: RiskCategory
}

export function buildAnalysis(
  vitals: VitalsInput,
  patientId: string
): AiAnalyzeResponse {
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
    `Computed risk category: ${risk}`,
  ]

  const summary =
    risk === "Normal"
      ? `Patient ${patientId}: vitals are within configured demo thresholds. Continue routine monitoring.`
      : risk === "At-Risk"
        ? `Patient ${patientId}: one or more vitals are borderline. Recommend closer observation and repeat measurements.`
        : `Patient ${patientId}: critical-range values detected in demo rules. Escalate per clinical protocol (mock alert).`

  return {
    summary,
    bullets,
    riskCategory: risk,
    disclaimer: "Mock AI analysis for coursework demo only — not medical advice.",
  }
}

export function buildAnalysisFromReading(reading: VitalReading): AiAnalyzeResponse {
  return buildAnalysis(reading, reading.patientId)
}

function hrNote(hr: number): string {
  if (hr < 60) return "below typical resting range"
  if (hr > 100) return "elevated"
  return "within typical resting range"
}

function spo2Note(spo2: number): string {
  if (spo2 < 90) return "critically low in demo rules"
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
  const pid = patientId ?? "the patient"

  if (lower.includes("risk") || lower.includes("critical")) {
    return `For ${pid}, risk is computed from HR, SpO₂, systolic BP, and temperature using the threshold table in Settings. Open the Analysis tab for a full mock summary.`
  }
  if (lower.includes("heart") || lower.includes("hr") || lower.includes("bpm")) {
    return `Heart rate rolling average and live HR are shown on the Live Monitor. ECG speed follows current BPM (illustrative only).`
  }
  if (lower.includes("spo") || lower.includes("oxygen")) {
    return `SpO₂ rate of change is derived as (current − previous) / interval. Negative values may indicate a downward trend in the simulator.`
  }
  if (lower.includes("hello") || lower.includes("hi")) {
    return `Hello — I'm the VitalWatch mock assistant (WIP). Ask about risk, vitals, or backend APIs at /api/health.`
  }
  return `Thanks for your question. This is a placeholder assistant: "${message.slice(0, 80)}${message.length > 80 ? "…" : ""}". Backend chat endpoint is wired; a real LLM is not connected yet.`
}
