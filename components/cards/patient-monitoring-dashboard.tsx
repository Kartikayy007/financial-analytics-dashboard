"use client"

import React, { useCallback, useMemo, useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Activity,
  Bell,
  Heart,
  Thermometer,
  Droplets,
  Gauge,
  Settings,
  LineChart as LineChartIcon,
  Monitor,
  Search,
  X,
  Check,
  AlertTriangle,
  Info,
  Clock,
  User,
  Stethoscope,
  ClipboardList,
  Cpu,
  LogOut,
  MessageSquare,
  NotebookPen,
} from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Button } from "@/components/ui/button"
import { EcgWaveform } from "@/components/ecg-waveform"
import type { VitalsAlert } from "@/hooks/use-patient-vitals"
import {
  PatientVitalsProvider,
  usePatientVitalsContext,
} from "@/components/patient-vitals-provider"
import { RISK_REFERENCE, type RiskCategory, TEMP_BASELINE_C } from "@/lib/patient-vitals"
import { AiAssistantSheet } from "@/components/ai-assistant-sheet"
import {
  CarePlanSection,
  DevicesSection,
  MessagesSection,
  MyDoctorSection,
} from "@/components/rpm/rpm-extra-sections"
import { HealthLogSection } from "@/components/rpm/health-log-section"
import { ClientOnlyChart } from "@/components/rpm/client-only-chart"
import { useLocalPatientStore } from "@/hooks/use-local-patient-store"
import type { DoctorProfile, PatientProfile } from "@/lib/rpm-mock-data"
import { buildSevenDayForecast, computeAnomalyScore } from "@/lib/rpm-ai"
import { Bar, BarChart, Cell, ReferenceLine } from "recharts"
import Link from "next/link"

const CARD_SHADOW =
  "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"

const SECTION_MIN_H = "min-h-[calc(100vh-10.5rem)]"

const C = {
  teal: "oklch(0.78 0.16 182)",
  azure: "oklch(0.68 0.14 245)",
  amber: "oklch(0.76 0.14 75)",
  rose: "oklch(0.62 0.22 18)",
  slate: "oklch(0.50 0.02 260)",
  grid: "oklch(0.24 0.01 260)",
  tick: "oklch(0.50 0.015 260)",
}

const SPRING = { type: "spring" as const, stiffness: 400, damping: 32 }
const EASE_OUT = [0.16, 1, 0.3, 1] as const

const HEALTH_LOG_NAV = { id: "healthlog", label: "Health Log", icon: NotebookPen } as const

const BASE_NAV = [
  { id: "monitor", label: "Live Monitor", icon: Monitor },
  { id: "trends", label: "Vitals Trends", icon: LineChartIcon },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
] as const

const PATIENT_NAV = [
  { id: "careplan", label: "Care Plan", icon: ClipboardList },
  { id: "mydoctor", label: "My Doctor", icon: Stethoscope },
  { id: "devices", label: "Devices", icon: Cpu },
  { id: "messages", label: "Messages", icon: MessageSquare },
] as const

type BaseSectionId = (typeof BASE_NAV)[number]["id"]
type PatientExtraId = (typeof PATIENT_NAV)[number]["id"]
type SectionId = BaseSectionId | PatientExtraId | "healthlog"

export type VitalsPortalConfig = {
  patient: PatientProfile
  userInitials: string
  userDisplayName: string
  onLogout?: () => void
  showPatientExtras?: boolean
  assignedDoctor?: DoctorProfile | null
  onLinkDoctor?: (code: string) => boolean
  viewerRole: "doctor" | "patient"
  backHref?: string
  backLabel?: string
  readOnlyHealthLog?: boolean
  initialSection?: SectionId
}

const VitalsPortalConfigContext = React.createContext<VitalsPortalConfig | null>(null)
const PortalNavContext = React.createContext<((section: SectionId) => void) | null>(null)

function usePortalNav() {
  return React.useContext(PortalNavContext)
}

function useVitalsPortalConfig() {
  const ctx = React.useContext(VitalsPortalConfigContext)
  if (!ctx) throw new Error("VitalsPortalConfig required")
  return ctx
}

const DOCTOR_EXTRA_NAV = [PATIENT_NAV[0], PATIENT_NAV[2], PATIENT_NAV[3]] as const

function buildNavItems(showPatientExtras: boolean, viewerRole: "doctor" | "patient") {
  const core = [BASE_NAV[0], BASE_NAV[1], HEALTH_LOG_NAV, BASE_NAV[2], BASE_NAV[3]]
  if (!showPatientExtras) return core
  if (viewerRole === "doctor") {
    return [BASE_NAV[0], BASE_NAV[1], HEALTH_LOG_NAV, BASE_NAV[2], ...DOCTOR_EXTRA_NAV, BASE_NAV[3]]
  }
  return [BASE_NAV[0], BASE_NAV[1], HEALTH_LOG_NAV, BASE_NAV[2], ...PATIENT_NAV, BASE_NAV[3]]
}

function riskStyles(risk: RiskCategory) {
  switch (risk) {
    case "Critical":
      return {
        badge: "bg-fin-loss/15 text-fin-loss border-fin-loss/40",
        glow: "shadow-[0_0_24px_oklch(0.62_0.22_18_/_0.35)]",
        dot: "bg-fin-loss",
      }
    case "At-Risk":
      return {
        badge: "bg-chart-3/15 text-chart-3 border-chart-3/40",
        glow: "shadow-[0_0_16px_oklch(0.76_0.14_75_/_0.25)]",
        dot: "bg-chart-3",
      }
    default:
      return {
        badge: "bg-fin-gain/12 text-fin-gain border-fin-gain/30",
        glow: "glow-teal-sm",
        dot: "bg-fin-gain",
      }
  }
}

function GlowOrb({ className }: { className?: string }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
}

function AnimatedValue({ value }: { value: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="inline-block"
    >
      {value}
    </motion.span>
  )
}

function VitalKpi({
  label,
  value,
  unit,
  delay = 0,
  icon: Icon,
}: {
  label: string
  value: string
  unit?: string
  delay?: number
  icon?: React.ElementType
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: EASE_OUT }}
      className="relative overflow-hidden rounded-2xl surface-card p-4 lg:p-5 group hover:scale-[1.01] transition-transform duration-300"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.03] pointer-events-none">
        {Icon && <Icon className="size-24 -translate-y-4 translate-x-4" />}
      </div>
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground mb-2.5 font-sans">
        {label}
      </p>
      <p className="text-2xl lg:text-3xl font-bold text-foreground font-mono tracking-tighter leading-none">
        <AnimatedValue value={value} />
        {unit && (
          <span className="text-base lg:text-lg text-muted-foreground ml-1 font-sans font-semibold">
            {unit}
          </span>
        )}
      </p>
    </motion.div>
  )
}

function SectionPanel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT }}
      className={`rounded-2xl surface-card p-5 lg:p-6 ${className}`}
      style={{ boxShadow: CARD_SHADOW }}
    >
      {children}
    </motion.div>
  )
}

function SectionHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h3 className="text-sm font-bold text-foreground tracking-tight font-display">{title}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-sans">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl surface-elevated p-3 text-xs backdrop-blur-md"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <p className="text-muted-foreground mb-2 font-semibold text-[11px] uppercase tracking-wider font-sans">
        {label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground capitalize font-sans">{entry.name}:</span>
          <span className="font-mono font-bold text-foreground">{entry.value ?? "—"}</span>
        </div>
      ))}
    </div>
  )
}

function NotificationIcon({ type }: { type: VitalsAlert["type"] }) {
  if (type === "success") return <Check className="size-3.5" />
  if (type === "warning") return <AlertTriangle className="size-3.5" />
  return <Info className="size-3.5" />
}

function NotificationPanel({
  isOpen,
  onClose,
  items,
  onMarkRead,
  onMarkAllRead,
}: {
  isOpen: boolean
  onClose: () => void
  items: VitalsAlert[]
  onMarkRead: (id: number) => void
  onMarkAllRead: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  const unreadCount = items.filter((n) => !n.read).length
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="absolute top-full right-0 mt-3 w-[420px] max-h-[30rem] rounded-2xl surface-elevated overflow-hidden z-50 glow-teal-sm"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-foreground font-display tracking-tight">Alerts</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-[11px] font-semibold text-primary hover:text-primary/80 px-2 py-1 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                aria-label="Close alerts"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[23rem]">
            {items.map((notif, i) => (
              <motion.button
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                onClick={() => onMarkRead(notif.id)}
                className={`w-full flex items-start gap-3.5 p-4 text-left border-b border-border/30 hover:bg-accent/30 transition-all duration-200 ${!notif.read ? "bg-primary/[0.04]" : ""}`}
              >
                <div
                  className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    notif.type === "success"
                      ? "bg-fin-gain/12 text-fin-gain"
                      : notif.type === "warning"
                        ? "bg-chart-3/12 text-chart-3"
                        : "bg-chart-2/12 text-chart-2"
                  }`}
                >
                  <NotificationIcon type={notif.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-foreground truncate font-sans">
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <div className="size-1.5 rounded-full bg-primary shrink-0 animate-pulse-soft" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed font-sans">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1.5 flex items-center gap-1 font-mono">
                    <Clock className="size-2.5" />
                    {notif.time}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function LiveMonitorSection() {
  const { snapshot } = usePatientVitalsContext()
  const { patient } = useVitalsPortalConfig()
  const { logs } = useLocalPatientStore(patient.id)
  const rs = riskStyles(snapshot.risk)
  const bedLine = patient.bed ? ` · ${patient.bed}` : ""
  const latestManual = logs.find((l) => l.kind === "manual_vitals")
  const docCount = logs.filter((l) => l.kind === "document").length

  return (
    <div className={`flex flex-col gap-5 ${SECTION_MIN_H}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary">
          WHOOP 2.0 · connected
        </span>
        {latestManual?.kind === "manual_vitals" && (
          <span className="text-[11px] text-muted-foreground font-mono px-3 py-1.5 rounded-full border border-border/40">
            Last manual:{" "}
            {latestManual.systolic && latestManual.diastolic
              ? `BP ${latestManual.systolic}/${latestManual.diastolic}`
              : latestManual.weightKg
                ? `${latestManual.weightKg} kg`
                : "vitals"}{" "}
            · {new Date(latestManual.recordedAt).toLocaleString()}
          </span>
        )}
        {docCount > 0 && (
          <span className="text-[11px] text-muted-foreground font-mono px-3 py-1.5 rounded-full border border-border/40">
            {docCount} record{docCount > 1 ? "s" : ""} on file
          </span>
        )}
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="size-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">{patient.name}</h2>
            <p className="text-xs text-muted-foreground font-mono">
              MRN {patient.mrn}{bedLine} · Age {patient.age}
            </p>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-bold text-sm font-display ${rs.badge} ${snapshot.risk === "Critical" ? rs.glow : ""}`}
        >
          <span className={`size-2.5 rounded-full ${rs.dot} animate-pulse-soft`} />
          Risk: {snapshot.risk}
        </div>
      </div>

      <SectionPanel className={`relative overflow-hidden border ${snapshot.risk === "Critical" ? "border-fin-loss/40" : "border-transparent"}`}>
        <GlowOrb className="w-64 h-64 -top-32 -right-32 bg-primary/10" />
        <SectionHeader title="Electrocardiogram (Lead II)" subtitle="WHOOP 2.0 live stream · waveform speed tied to heart rate">
          <div className="flex items-center gap-2 text-xs font-mono text-primary">
            <Heart className="size-3.5" />
            {snapshot.heartRate} bpm
          </div>
        </SectionHeader>
        <EcgWaveform heartRateBpm={snapshot.heartRate} risk={snapshot.risk} height={220} />
      </SectionPanel>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <VitalKpi label="Heart Rate (HR)" value={String(snapshot.heartRate)} unit="bpm" delay={0} icon={Heart} />
        <VitalKpi label="SpO₂" value={snapshot.spo2.toFixed(1)} unit="%" delay={0.05} icon={Droplets} />
        <VitalKpi
          label="Systolic BP"
          value={String(snapshot.systolic)}
          unit="mmHg"
          delay={0.1}
          icon={Activity}
        />
        <VitalKpi
          label="Diastolic BP"
          value={String(snapshot.diastolic)}
          unit="mmHg"
          delay={0.15}
          icon={Activity}
        />
        <VitalKpi
          label="Body Temperature"
          value={snapshot.temperature.toFixed(2)}
          unit="°C"
          delay={0.2}
          icon={Thermometer}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <VitalKpi
          label="HR Rolling Average"
          value={snapshot.hrRollingAverage.toFixed(1)}
          unit="bpm"
          delay={0.25}
          icon={Gauge}
        />
        <VitalKpi
          label="SpO₂ Rate of Change"
          value={snapshot.spo2RateOfChange.toFixed(3)}
          unit="%/s"
          delay={0.3}
          icon={LineChartIcon}
        />
        <VitalKpi
          label="Pulse Pressure"
          value={String(snapshot.pulsePressure)}
          unit="mmHg"
          delay={0.35}
          icon={Stethoscope}
        />
        <VitalKpi
          label="Temperature Deviation"
          value={
            snapshot.temperatureDeviation >= 0
              ? `+${snapshot.temperatureDeviation.toFixed(2)}`
              : snapshot.temperatureDeviation.toFixed(2)
          }
          unit={`°C vs ${TEMP_BASELINE_C}`}
          delay={0.4}
          icon={Thermometer}
        />
      </div>
    </div>
  )
}

function TrendsSection() {
  const { history, snapshot } = usePatientVitalsContext()
  const { patient } = useVitalsPortalConfig()
  const { logs } = useLocalPatientStore(patient.id)
  const navigate = usePortalNav()
  const anomaly = computeAnomalyScore(snapshot, history)
  const forecast = buildSevenDayForecast(history)

  const manualBp = logs
    .filter((l): l is import("@/lib/rpm-local-store").ManualVitalsLog => l.kind === "manual_vitals" && Boolean(l.systolic))
    .slice(0, 14)
    .reverse()
    .map((l, i) => ({
      label: `${i + 1}`,
      systolic: l.systolic,
      diastolic: l.diastolic,
    }))

  const weightGlucose = logs
    .filter(
      (l): l is import("@/lib/rpm-local-store").ManualVitalsLog =>
        l.kind === "manual_vitals" && (Boolean(l.weightKg) || Boolean(l.glucoseMgDl))
    )
    .slice(0, 14)
    .reverse()
    .map((l, i) => ({
      label: `${i + 1}`,
      weightKg: l.weightKg,
      glucoseMgDl: l.glucoseMgDl,
    }))

  const activityBars = logs
    .filter((l): l is import("@/lib/rpm-local-store").ActivityLog => l.kind === "activity")
    .slice(0, 14)
    .reverse()
    .map((l, i) => ({
      label: `D${i + 1}`,
      steps: l.steps ?? 0,
      sleepHours: l.sleepHours ?? 0,
    }))
  const chartData = history.length > 0 ? history : [
    {
      time: "0",
      heartRate: snapshot.heartRate,
      spo2: snapshot.spo2,
      systolic: snapshot.systolic,
      diastolic: snapshot.diastolic,
      temperature: snapshot.temperature,
      risk: snapshot.risk,
    },
  ]

  return (
    <div className={`flex flex-col gap-5 ${SECTION_MIN_H}`}>
      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionPanel>
          <SectionHeader title="VitalAI anomaly score" subtitle="Model output · 0–100" />
          <div className="space-y-3">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold font-display text-foreground">{anomaly}</span>
              <span className="text-xs text-muted-foreground pb-1">/ 100</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {anomaly >= 70
                ? "Elevated pattern — review alerts and care plan."
                : anomaly >= 40
                  ? "Mild deviation — continue scheduled monitoring."
                  : "Within expected variability for this patient."}
            </p>
          </div>
        </SectionPanel>
        <SectionPanel>
          <SectionHeader title="7-day HR forecast" subtitle="VitalAI time-series model" />
          <ClientOnlyChart className="h-40 w-full">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={forecast} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: C.tick }} axisLine={false} tickLine={false} />
                <YAxis domain={[55, 120]} tick={{ fontSize: 10, fill: C.tick }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <ReferenceLine y={snapshot.heartRate} stroke={C.azure} strokeDasharray="4 4" />
                <Bar dataKey="heartRate" name="Forecast HR" radius={[6, 6, 0, 0]}>
                  {forecast.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.teal : C.slate} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        </SectionPanel>
      </motion.div>

      <SectionPanel>
        <SectionHeader title="Heart Rate & SpO₂" subtitle="Last 60 ingest packets from wearable" />
        <ClientOnlyChart className="h-72 w-full">
          <ResponsiveContainer width="100%" height={288}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: C.tick }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="hr" tick={{ fontSize: 11, fill: C.tick }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="spo2"
                orientation="right"
                domain={[85, 100]}
                tick={{ fontSize: 11, fill: C.tick }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="heartRate"
                name="HR (bpm)"
                stroke={C.teal}
                strokeWidth={2}
                dot={false}
                animationDuration={400}
              />
              <Line
                yAxisId="spo2"
                type="monotone"
                dataKey="spo2"
                name="SpO₂ (%)"
                stroke={C.azure}
                strokeWidth={2}
                dot={false}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        </ClientOnlyChart>
      </SectionPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionPanel>
          <SectionHeader title="Blood Pressure" subtitle="Systolic and diastolic (mmHg)" />
          <ClientOnlyChart className="h-56 w-full">
            <ResponsiveContainer width="100%" height={224}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: C.tick }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.tick }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="systolic" name="Systolic" stroke={C.amber} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke={C.slate} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        </SectionPanel>

        <SectionPanel>
          <SectionHeader title="Core Temperature" subtitle="Body temperature (°C)" />
          <ClientOnlyChart className="h-56 w-full">
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.rose} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={C.rose} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: C.tick }} axisLine={false} tickLine={false} />
                <YAxis domain={[34, 41]} tick={{ fontSize: 11, fill: C.tick }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  name="Temp (°C)"
                  stroke={C.rose}
                  fill="url(#tempGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        </SectionPanel>
      </div>

      <SectionPanel>
        <SectionHeader title="Logged health data" subtitle="From Health Log (local device storage)" />
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">Log BP, weight, steps, or upload an ECG PDF to see charts here.</p>
            {navigate && (
              <Button variant="outline" size="sm" onClick={() => navigate("healthlog")}>
                Open Health Log
              </Button>
            )}
          </div>
        ) : manualBp.length === 0 && weightGlucose.length === 0 && activityBars.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              You have Health Log entries, but no chartable vitals or activity yet. Log BP, weight, or steps to see graphs
              here.
            </p>
            {navigate && (
              <Button variant="outline" size="sm" onClick={() => navigate("healthlog")}>
                Open Health Log
              </Button>
            )}
          </div>
        ) : (
          <CardGrid manualBp={manualBp} weightGlucose={weightGlucose} activityBars={activityBars} />
        )}
      </SectionPanel>
    </div>
  )
}

function CardGrid({
  manualBp,
  weightGlucose,
  activityBars,
}: {
  manualBp: { label: string; systolic?: number; diastolic?: number }[]
  weightGlucose: { label: string; weightKg?: number; glucoseMgDl?: number }[]
  activityBars: { label: string; steps: number; sleepHours: number }[]
}) {
  return (
    <CardGridBody manualBp={manualBp} weightGlucose={weightGlucose} activityBars={activityBars} />
  )
}

function CardGridBody({
  manualBp,
  weightGlucose,
  activityBars,
}: {
  manualBp: { label: string; systolic?: number; diastolic?: number }[]
  weightGlucose: { label: string; weightKg?: number; glucoseMgDl?: number }[]
  activityBars: { label: string; steps: number; sleepHours: number }[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {manualBp.length > 0 && (
        <div className="min-h-[220px]">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Manual blood pressure</p>
          <ClientOnlyChart className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height={200}>
            <LineChart data={manualBp}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.tick }} />
              <YAxis tick={{ fontSize: 10, fill: C.tick }} />
              <Tooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="systolic" name="Systolic" stroke={C.amber} strokeWidth={2} dot />
              <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke={C.slate} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
          </ClientOnlyChart>
        </div>
      )}
      {weightGlucose.length > 0 && (
        <div className="min-h-[220px]">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Weight & glucose</p>
          <ClientOnlyChart className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightGlucose}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.tick }} />
              <YAxis yAxisId="w" tick={{ fontSize: 10, fill: C.tick }} />
              <YAxis yAxisId="g" orientation="right" tick={{ fontSize: 10, fill: C.tick }} />
              <Tooltip content={<ChartTooltipContent />} />
              <Line yAxisId="w" type="monotone" dataKey="weightKg" name="Weight kg" stroke={C.teal} strokeWidth={2} dot />
              <Line yAxisId="g" type="monotone" dataKey="glucoseMgDl" name="Glucose" stroke={C.rose} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
          </ClientOnlyChart>
        </div>
      )}
      {activityBars.length > 0 && (
        <div className="min-h-[220px] lg:col-span-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Steps & sleep (logged)</p>
          <ClientOnlyChart className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityBars}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.tick }} />
              <YAxis tick={{ fontSize: 10, fill: C.tick }} />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="steps" name="Steps" fill={C.azure} radius={[4, 4, 0, 0]} />
              <Bar dataKey="sleepHours" name="Sleep h" fill={C.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </ClientOnlyChart>
        </div>
      )}
    </div>
  )
}

function AlertsSection() {
  const { alerts, markAlertRead, snapshot } = usePatientVitalsContext()
  const rs = riskStyles(snapshot.risk)

  return (
    <div className={`flex flex-col gap-5 ${SECTION_MIN_H}`}>
      <SectionPanel>
        <SectionHeader
          title="Current risk classification"
          subtitle="Target risk category label from vitals rules"
        >
          <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${rs.badge}`}>
            {snapshot.risk}
          </span>
        </SectionHeader>
        <p className="text-sm text-muted-foreground font-sans leading-relaxed">
          Alerts fire when risk moves to <strong className="text-foreground">At-Risk</strong> or{" "}
          <strong className="text-foreground">Critical</strong>. WHOOP stream refreshes about every 2 seconds; manual vitals appear from your Health Log.
        </p>
      </SectionPanel>

      <SectionPanel>
        <SectionHeader title="Alert history" subtitle="Most recent events first" />
        <div className="flex flex-col gap-2">
          {alerts.map((a) => (
            <button
              key={a.id}
              onClick={() => markAlertRead(a.id)}
              className={`flex items-start gap-3 p-4 rounded-xl text-left border border-border/40 hover:bg-accent/20 transition-colors ${!a.read ? "bg-primary/[0.04]" : ""}`}
            >
              <NotificationIcon type={a.type} />
              <div>
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">{a.time}</p>
              </div>
            </button>
          ))}
        </div>
      </SectionPanel>
    </div>
  )
}

function SettingsSection() {
  return (
    <div className={`flex flex-col gap-5 ${SECTION_MIN_H}`}>
      <SectionPanel>
        <SectionHeader
          title="Reference ranges"
          subtitle="Thresholds used for Normal / At-Risk / Critical labels"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                <th className="py-3 pr-4 font-semibold">Metric</th>
                <th className="py-3 pr-4 font-semibold">Unit</th>
                <th className="py-3 pr-4 font-semibold">Normal</th>
                <th className="py-3 pr-4 font-semibold">At-Risk</th>
                <th className="py-3 font-semibold">Critical</th>
              </tr>
            </thead>
            <tbody>
              {RISK_REFERENCE.map((row) => (
                <tr key={row.metric} className="border-b border-border/30">
                  <td className="py-3 pr-4 font-medium text-foreground">{row.metric}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{row.unit}</td>
                  <td className="py-3 pr-4 text-fin-gain font-mono text-xs">{row.normal}</td>
                  <td className="py-3 pr-4 text-chart-3 font-mono text-xs">{row.atRisk}</td>
                  <td className="py-3 text-fin-loss font-mono text-xs">{row.critical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      <SectionPanel>
        <SectionHeader title="WHOOP + manual entries" subtitle="Single wearable stream and patient-logged data" />
        <ul className="text-sm text-muted-foreground space-y-2 font-sans list-disc pl-5">
          <li>WHOOP 2.0 supplies the live HR and SpO₂ stream on Live Monitor.</li>
          <li>BP, weight, glucose, documents, and activity are entered under Health Log (stored on this device).</li>
          <li>
            Derived metrics: HR rolling mean, SpO₂ rate of change, pulse pressure, temperature deviation from{" "}
            {TEMP_BASELINE_C}°C.
          </li>
          <li>ECG trace follows live BPM for review; uploaded ECG PDFs appear in Health Log records.</li>
        </ul>
      </SectionPanel>
    </div>
  )
}

function CarePlanPortalSection() {
  const { patient } = useVitalsPortalConfig()
  return <CarePlanSection patientId={patient.id} />
}

function MyDoctorPortalSection() {
  const { patient, assignedDoctor, onLinkDoctor } = useVitalsPortalConfig()
  return (
    <MyDoctorSection
      patient={patient}
      doctor={assignedDoctor ?? null}
      onLink={(code) => onLinkDoctor?.(code) ?? false}
    />
  )
}

function DevicesPortalSection() {
  const { patient } = useVitalsPortalConfig()
  return <DevicesSection patientId={patient.id} />
}

function MessagesPortalSection() {
  const { patient, viewerRole } = useVitalsPortalConfig()
  return <MessagesSection patientId={patient.id} viewer={viewerRole === "doctor" ? "doctor" : "patient"} />
}

function HealthLogPortalSection() {
  const { patient, readOnlyHealthLog, viewerRole } = useVitalsPortalConfig()
  const readOnly = readOnlyHealthLog ?? viewerRole === "doctor"
  return <HealthLogSection patientId={patient.id} readOnly={readOnly} />
}

function PatientMonitoringDashboardInner({ portal }: { portal: VitalsPortalConfig }) {
  const navItems = useMemo(
    () => buildNavItems(portal.showPatientExtras ?? false, portal.viewerRole),
    [portal.showPatientExtras, portal.viewerRole]
  )
  const validSections: SectionId[] = [
    "monitor",
    "trends",
    "healthlog",
    "alerts",
    "settings",
    "careplan",
    "mydoctor",
    "devices",
    "messages",
  ]
  const initial = portal.initialSection && validSections.includes(portal.initialSection) ? portal.initialSection : "monitor"
  const [activeSection, setActiveSection] = useState<SectionId>(initial)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { alerts, markAlertRead, markAllAlertsRead, snapshot, lastUpdated } = usePatientVitalsContext()

  const handleNavigation = useCallback(
    (sectionId: SectionId) => {
      if (sectionId === activeSection) return
      setIsTransitioning(true)
      setTimeout(() => {
        setActiveSection(sectionId)
        setIsTransitioning(false)
      }, 180)
    },
    [activeSection]
  )

  const ActiveComponent = useMemo(() => {
    switch (activeSection) {
      case "monitor":
        return LiveMonitorSection
      case "trends":
        return TrendsSection
      case "alerts":
        return AlertsSection
      case "settings":
        return SettingsSection
      case "careplan":
        return CarePlanPortalSection
      case "mydoctor":
        return MyDoctorPortalSection
      case "devices":
        return DevicesPortalSection
      case "messages":
        return MessagesPortalSection
      case "healthlog":
        return HealthLogPortalSection
      default:
        return LiveMonitorSection
    }
  }, [activeSection])
  const activeNav = useMemo(() => navItems.find((n) => n.id === activeSection), [activeSection, navItems])
  const unreadCount = alerts.filter((n) => !n.read).length
  const rs = riskStyles(snapshot.risk)

  const lastUpdatedStr = useMemo(() => {
    const d = new Date(lastUpdated)
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }, [lastUpdated])

  return (
    <PortalNavContext.Provider value={handleNavigation}>
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.16_182_/_0.06),transparent_50%)] pointer-events-none" />

      <header className="border-b border-border/40 bg-card/60 backdrop-blur-xl sticky top-0 z-30 relative">
        <div className="w-full px-5 lg:px-10 xl:px-14">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center glow-teal-sm">
                <Activity className="size-5 text-primary" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-foreground font-display">
                  VitalWatch
                </span>
                <p className="text-[10px] text-muted-foreground font-mono -mt-0.5">
                  {activeNav?.label ?? "Patient Monitoring"}
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search patient MRN..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  readOnly
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <AiAssistantSheet snapshot={snapshot} patientId={portal.patient.id} />
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className="p-2.5 rounded-xl hover:bg-accent/50 transition-all duration-200 relative"
                  aria-label="Alerts"
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="size-4 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={SPRING}
                      className="absolute -top-0.5 -right-0.5 size-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center font-mono"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </button>
                <NotificationPanel
                  isOpen={notificationsOpen}
                  onClose={() => setNotificationsOpen(false)}
                  items={alerts}
                  onMarkRead={markAlertRead}
                  onMarkAllRead={markAllAlertsRead}
                />
              </div>
              <button
                className="p-2.5 rounded-xl hover:bg-accent/50 transition-all duration-200"
                aria-label="Settings"
                onClick={() => handleNavigation("settings")}
              >
                <Settings className="size-4 text-muted-foreground" />
              </button>
              {portal.backHref && (
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                  <Link href={portal.backHref}>{portal.backLabel ?? "Back"}</Link>
                </Button>
              )}
              {portal.onLogout && (
                <button
                  type="button"
                  onClick={portal.onLogout}
                  className="p-2.5 rounded-xl hover:bg-accent/50 transition-all duration-200"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4 text-muted-foreground" />
                </button>
              )}
              <div className="size-9 rounded-xl bg-primary/12 flex items-center justify-center ml-1.5 glow-teal-sm" title={portal.userDisplayName}>
                <span className="text-xs font-bold text-primary font-display">{portal.userInitials}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b border-border/40 bg-card/40 backdrop-blur-xl sticky top-16 z-20 relative">
        <div className="w-full px-5 lg:px-10 xl:px-14">
          <div className="flex items-center gap-0.5 overflow-x-auto py-1.5 -mb-px scrollbar-none">
            {navItems.map((item) => {
              const isActive = item.id === activeSection
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-xl transition-all duration-250 whitespace-nowrap shrink-0 font-sans ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-primary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <main className="w-full px-5 lg:px-10 xl:px-14 py-6 lg:py-8 flex-1 relative z-10">
        <div key={activeSection} className={isTransitioning ? "opacity-80 transition-opacity duration-150" : ""}>
          <ActiveComponent />
        </div>
      </main>

      <footer className="border-t border-border/40 mt-auto relative z-10">
        <div className="w-full px-5 lg:px-10 xl:px-14 py-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-sans">
            <div className="flex items-center gap-2">
              <div className={`size-2 rounded-full ${rs.dot} animate-pulse-soft`} />
              <span className="font-medium">
                {snapshot.risk === "Critical"
                  ? "Clinical attention required"
                  : snapshot.risk === "At-Risk"
                    ? "Elevated risk — monitor closely"
                    : "Vitals within normal range"}
              </span>
            </div>
            <span className="font-mono text-muted-foreground/60">Last updated: {lastUpdatedStr}</span>
          </div>
        </div>
      </footer>
    </div>
    </PortalNavContext.Provider>
  )
}

export function VitalsPortal({
  portal,
  vitalsOptions,
}: {
  portal: VitalsPortalConfig
  vitalsOptions?: import("@/hooks/use-patient-vitals").UsePatientVitalsOptions
}) {
  return (
    <VitalsPortalConfigContext.Provider value={portal}>
      <PatientVitalsProvider vitalsOptions={vitalsOptions}>
        <PatientMonitoringDashboardInner portal={portal} />
      </PatientVitalsProvider>
    </VitalsPortalConfigContext.Provider>
  )
}

/** @deprecated Use VitalsPortal via /patient or /doctor routes */
export default function PatientMonitoringDashboard() {
  const fallbackPatient: PatientProfile = {
    id: "P-2026-0847",
    mrn: "2026-0847",
    name: "Priya Sharma",
    age: 54,
    bed: "Home monitoring",
    doctorId: "D-001",
    vitalSeed: {
      heartRate: 78,
      spo2: 98,
      systolic: 120,
      diastolic: 80,
      temperature: 37,
      timestamp: Date.now(),
    },
  }
  return (
    <VitalsPortal
      portal={{
        patient: fallbackPatient,
        userInitials: "PS",
        userDisplayName: "Priya Sharma",
        viewerRole: "patient",
        showPatientExtras: true,
      }}
    />
  )
}
