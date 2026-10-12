export type RiskCategory = "Normal" | "At-Risk" | "Critical"

export type PatientVitals = {
  heartRate: number
  spo2: number
  systolic: number
  diastolic: number
  temperature: number
  timestamp: number
}

export type DerivedVitals = {
  hrRollingAverage: number
  spo2RateOfChange: number
  pulsePressure: number
  temperatureDeviation: number
}

export type VitalsSnapshot = PatientVitals & DerivedVitals & { risk: RiskCategory }

export const HR_ROLLING_WINDOW = 10
export const TICK_INTERVAL_MS = 2000
export const TEMP_BASELINE_C = 37.0

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function randn() {
  const u = Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function createInitialVitals(): PatientVitals {
  return {
    heartRate: 78,
    spo2: 98,
    systolic: 120,
    diastolic: 80,
    temperature: 37.0,
    timestamp: Date.now(),
  }
}

export type TickOptions = {
  /** 0–1 chance to nudge toward abnormal demo values */
  demoBiasChance?: number
}

export function tickVitals(prev: PatientVitals, options: TickOptions = {}): PatientVitals {
  const biasChance = options.demoBiasChance ?? 0.08
  const roll = Math.random()
  let target: Partial<PatientVitals> = {}

  if (roll < biasChance * 0.4) {
    target = { heartRate: 125, spo2: 88, systolic: 185, diastolic: 95, temperature: 39.8 }
  } else if (roll < biasChance) {
    target = { heartRate: 105, spo2: 92, systolic: 165, diastolic: 88, temperature: 38.4 }
  }

  const step = (current: number, delta: number, min: number, max: number, targetVal?: number) => {
    if (targetVal !== undefined) {
      return clamp(current + (targetVal - current) * 0.35 + randn() * 0.5, min, max)
    }
    return clamp(current + delta + randn() * 0.4, min, max)
  }

  let heartRate = step(prev.heartRate, randn() * 1.2, 45, 140, target.heartRate)
  let spo2 = step(prev.spo2, randn() * 0.15, 85, 100, target.spo2)
  let systolic = step(prev.systolic, randn() * 2, 85, 190, target.systolic)
  let diastolic = step(prev.diastolic, randn() * 1.5, 50, 120, target.diastolic)

  if (diastolic >= systolic - 15) {
    diastolic = systolic - 20 - Math.random() * 15
  }
  diastolic = clamp(diastolic, 50, systolic - 15)

  const temperature = step(prev.temperature, randn() * 0.05, 34.5, 40.5, target.temperature)

  return {
    heartRate: Math.round(heartRate),
    spo2: Math.round(spo2 * 10) / 10,
    systolic: Math.round(systolic),
    diastolic: Math.round(diastolic),
    temperature: Math.round(temperature * 100) / 100,
    timestamp: Date.now(),
  }
}

export function computeDerived(
  current: PatientVitals,
  previous: PatientVitals | null,
  hrHistory: number[],
  deltaSeconds: number
): DerivedVitals {
  const window = hrHistory.length ? hrHistory : [current.heartRate]
  const hrRollingAverage =
    window.reduce((sum, v) => sum + v, 0) / window.length

  const spo2Delta = previous ? current.spo2 - previous.spo2 : 0
  const spo2RateOfChange = deltaSeconds > 0 ? spo2Delta / deltaSeconds : 0

  return {
    hrRollingAverage: Math.round(hrRollingAverage * 10) / 10,
    spo2RateOfChange: Math.round(spo2RateOfChange * 1000) / 1000,
    pulsePressure: current.systolic - current.diastolic,
    temperatureDeviation: Math.round((current.temperature - TEMP_BASELINE_C) * 100) / 100,
  }
}

type MetricRisk = RiskCategory

function worstRisk(a: MetricRisk, b: MetricRisk): MetricRisk {
  const rank = { Normal: 0, "At-Risk": 1, Critical: 2 }
  return rank[a] >= rank[b] ? a : b
}

function riskHeartRate(hr: number): MetricRisk {
  if (hr < 50 || hr > 120) return "Critical"
  if (hr < 60 || hr > 100) return "At-Risk"
  return "Normal"
}

function riskSpo2(spo2: number): MetricRisk {
  if (spo2 < 90) return "Critical"
  if (spo2 < 95) return "At-Risk"
  return "Normal"
}

function riskSystolic(sbp: number): MetricRisk {
  if (sbp < 90 || sbp > 180) return "Critical"
  if (sbp < 100 || sbp > 160) return "At-Risk"
  return "Normal"
}

function riskTemperature(temp: number): MetricRisk {
  if (temp < 35 || temp > 39.5) return "Critical"
  if (temp < 36 || temp > 38) return "At-Risk"
  return "Normal"
}

export function classifyRisk(vitals: PatientVitals): RiskCategory {
  let risk: RiskCategory = "Normal"
  risk = worstRisk(risk, riskHeartRate(vitals.heartRate))
  risk = worstRisk(risk, riskSpo2(vitals.spo2))
  risk = worstRisk(risk, riskSystolic(vitals.systolic))
  risk = worstRisk(risk, riskTemperature(vitals.temperature))
  return risk
}

export function buildSnapshot(
  vitals: PatientVitals,
  derived: DerivedVitals
): VitalsSnapshot {
  return {
    ...vitals,
    ...derived,
    risk: classifyRisk(vitals),
  }
}

export type HistoryPoint = {
  time: string
  heartRate: number
  spo2: number
  systolic: number
  diastolic: number
  temperature: number
  risk: RiskCategory
}

export function toHistoryPoint(vitals: VitalsSnapshot, index: number): HistoryPoint {
  const d = new Date(vitals.timestamp)
  const label = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`
  return {
    time: index === 0 ? label : `${index}`,
    heartRate: vitals.heartRate,
    spo2: vitals.spo2,
    systolic: vitals.systolic,
    diastolic: vitals.diastolic,
    temperature: vitals.temperature,
    risk: vitals.risk,
  }
}

export const RISK_REFERENCE = [
  {
    metric: "Heart Rate",
    unit: "bpm",
    normal: "60–100",
    atRisk: "50–60 or 100–120",
    critical: "< 50 or > 120",
  },
  {
    metric: "SpO₂",
    unit: "%",
    normal: "≥ 95",
    atRisk: "90–94",
    critical: "< 90",
  },
  {
    metric: "Systolic BP",
    unit: "mmHg",
    normal: "100–160",
    atRisk: "90–100 or 160–180",
    critical: "< 90 or > 180",
  },
  {
    metric: "Temperature",
    unit: "°C",
    normal: "36–38",
    atRisk: "35–36 or 38–39.5",
    critical: "< 35 or > 39.5",
  },
] as const
