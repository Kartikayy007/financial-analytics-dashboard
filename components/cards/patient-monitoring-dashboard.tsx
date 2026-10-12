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
import { EcgWaveform } from "@/components/ecg-waveform"
import type { VitalsAlert } from "@/hooks/use-patient-vitals"
import {
  PatientVitalsProvider,
  usePatientVitalsContext,
} from "@/components/patient-vitals-provider"
import { RISK_REFERENCE, type RiskCategory, TEMP_BASELINE_C } from "@/lib/patient-vitals"
import { AiAssistantSheet } from "@/components/ai-assistant-sheet"
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

const NAV_ITEMS = [
  { id: "monitor", label: "Live Monitor", icon: Monitor },
  { id: "trends", label: "Vitals Trends", icon: LineChartIcon },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
] as const

type SectionId = (typeof NAV_ITEMS)[number]["id"]

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
          <span className="font-mono font-bold text-foreground">{entry.value}</span>
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
  const rs = riskStyles(snapshot.risk)

  return (
    <div className={`flex flex-col gap-5 ${SECTION_MIN_H}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="size-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">Priya Sharma</h2>
            <p className="text-xs text-muted-foreground font-mono">
              MRN 2026-0847 · Bed ICU-12 · Age 54
            </p>
          </div>
        </div>
        <motion.div
          animate={snapshot.risk === "Critical" ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ repeat: snapshot.risk === "Critical" ? Infinity : 0, duration: 1.2 }}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-bold text-sm font-display ${rs.badge} ${rs.glow}`}
        >
          <span className={`size-2.5 rounded-full ${rs.dot} animate-pulse-soft`} />
          Risk: {snapshot.risk}
        </motion.div>
      </div>

      <SectionPanel className={`relative overflow-hidden border ${snapshot.risk === "Critical" ? "border-fin-loss/40" : "border-transparent"}`}>
        <GlowOrb className="w-64 h-64 -top-32 -right-32 bg-primary/10" />
        <SectionHeader title="Electrocardiogram (Lead II)" subtitle="Real-time simulated waveform · speed tied to heart rate">
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
      <SectionPanel>
        <SectionHeader title="Heart Rate & SpO₂" subtitle="Last 60 readings (simulated stream)" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
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
        </div>
      </SectionPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionPanel>
          <SectionHeader title="Blood Pressure" subtitle="Systolic and diastolic (mmHg)" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: C.tick }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.tick }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="systolic" name="Systolic" stroke={C.amber} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke={C.slate} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel>
          <SectionHeader title="Core Temperature" subtitle="Body temperature (°C)" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
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
          </div>
        </SectionPanel>
      </div>
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
          <strong className="text-foreground">Critical</strong>. Values update every 2 seconds in demo mode.
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
        <SectionHeader title="Demo simulation" subtitle="Client vitals simulator + separate WIP REST APIs" />
        <ul className="text-sm text-muted-foreground space-y-2 font-sans list-disc pl-5">
          <li>Vitals use bounded random walk with occasional bias toward abnormal values for demos.</li>
          <li>
            Derived: HR rolling mean (10 samples), SpO₂ rate of change (%/s), pulse pressure, temp deviation from{" "}
            {TEMP_BASELINE_C}°C.
          </li>
          <li>ECG waveform is illustrative, not diagnostic.</li>
          <li>
            <strong className="text-foreground">Backend APIs (WIP):</strong> in-memory routes under{" "}
            <code className="text-xs">app/api</code> — see{" "}
            <Link href="/api/health" className="text-primary hover:underline" target="_blank">
              /api/health
            </Link>
            , demo login at{" "}
            <Link href="/login" className="text-primary hover:underline">
              /login
            </Link>
            . Live monitor is <em>not</em> wired to the API yet.
          </li>
        </ul>
      </SectionPanel>
    </div>
  )
}

const sectionComponents: Record<SectionId, React.FC> = {
  monitor: LiveMonitorSection,
  trends: TrendsSection,
  alerts: AlertsSection,
  settings: SettingsSection,
}

function PatientMonitoringDashboardInner() {
  const [activeSection, setActiveSection] = useState<SectionId>("monitor")
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

  const ActiveComponent = useMemo(() => sectionComponents[activeSection], [activeSection])
  const activeNav = useMemo(() => NAV_ITEMS.find((n) => n.id === activeSection), [activeSection])
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
              <AiAssistantSheet snapshot={snapshot} />
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
              <div className="size-9 rounded-xl bg-primary/12 flex items-center justify-center ml-1.5 glow-teal-sm">
                <span className="text-xs font-bold text-primary font-display">RN</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b border-border/40 bg-card/40 backdrop-blur-xl sticky top-16 z-20 relative">
        <div className="w-full px-5 lg:px-10 xl:px-14">
          <div className="flex items-center gap-0.5 overflow-x-auto py-1.5 -mb-px scrollbar-none">
            {NAV_ITEMS.map((item) => {
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
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-primary"
                      style={{ boxShadow: `0 0 8px 2px oklch(0.78 0.16 182 / 0.3)` }}
                      transition={SPRING}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <main className="w-full px-5 lg:px-10 xl:px-14 py-6 lg:py-8 flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: isTransitioning ? 0.3 : 1, y: isTransitioning ? 6 : 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
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
  )
}

export default function PatientMonitoringDashboard() {
  return (
    <PatientVitalsProvider>
      <PatientMonitoringDashboardInner />
    </PatientVitalsProvider>
  )
}
