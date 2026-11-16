"use client"

import Link from "next/link"
import { useEffect, useMemo } from "react"
import { motion } from "motion/react"
import { Activity, ChevronRight, FileText, LogOut, Users, Watch } from "lucide-react"
import { useRpmPatientRegistry } from "@/hooks/use-rpm-patient-registry"
import { useRpmSession } from "@/components/rpm/session-provider"
import { userInitials } from "@/lib/rpm-auth"
import {
  buildAttentionQueue,
  formatManualBp,
  countDocumentLogs,
  loadLogs,
  markDoctorSeenLogCount,
} from "@/lib/rpm-local-store"
import { useLocalPatientStore } from "@/hooks/use-local-patient-store"
import { Button } from "@/components/ui/button"
import type { PatientProfile } from "@/lib/rpm-mock-data"

const CARD_SHADOW =
  "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px"

function PatientLogCount({ patientId }: { patientId: string }) {
  const { logs } = useLocalPatientStore(patientId)
  return <>{logs.length}</>
}

function riskBadge(risk: string) {
  if (risk === "Critical") return "bg-fin-loss/15 text-fin-loss border-fin-loss/40"
  if (risk === "At-Risk") return "bg-chart-3/15 text-chart-3 border-chart-3/40"
  return "bg-fin-gain/12 text-fin-gain border-fin-gain/30"
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-card/80 border border-border/30 p-4" style={{ boxShadow: CARD_SHADOW }}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-2xl font-bold font-display mt-1">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export function DoctorDashboard() {
  const { session, signOut, linkedPatients } = useRpmSession()
  const doctorId = session?.user.doctorId
  const { rows } = useRpmPatientRegistry(doctorId)
  const initials = session ? userInitials(session.user.name) : "DR"

  useEffect(() => {
    for (const p of linkedPatients) {
      markDoctorSeenLogCount(p.id, loadLogs(p.id).length)
    }
  }, [linkedPatients])

  const risks = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of rows) map[r.patientId] = r.risk
    return map
  }, [rows])

  const sorted = [...linkedPatients].sort((a, b) => {
    const ra = risks[a.id] ?? "Normal"
    const rb = risks[b.id] ?? "Normal"
    const rank = { Critical: 0, "At-Risk": 1, Normal: 2 }
    return rank[ra as keyof typeof rank] - rank[rb as keyof typeof rank]
  })

  const criticalCount = rows.filter((r) => r.risk === "Critical").length
  const atRiskCount = rows.filter((r) => r.risk === "At-Risk").length
  const whoopLive = rows.filter((r) => r.lastSyncMs < 15_000).length
  const totalLogs = linkedPatients.reduce((sum, p) => sum + loadLogs(p.id).length, 0)

  const attention = buildAttentionQueue(
    linkedPatients.map((p) => p.id),
    risks
  )

  const patientName = (id: string) => linkedPatients.find((p) => p.id === id)?.name ?? id

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="w-full px-5 lg:px-10 xl:px-14 flex items-center justify-between h-16">
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center glow-teal-sm">
              <Activity className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-display font-bold text-base">VitalWatch</p>
              <p className="text-[10px] text-muted-foreground font-mono">Physician command center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{session?.user.name}</span>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
            <div className="size-9 rounded-xl bg-primary/12 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 lg:px-10 xl:px-14 py-8">
        <motion.div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Users className="size-6 text-primary" />
            <h1 className="text-2xl font-bold font-display">Remote patient roster</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            WHOOP 2.0 streams plus patient Health Logs on this device. Open a row for vitals, trends, records, and
            messages.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Enrolled" value={linkedPatients.length} sub="under your care team" />
            <KpiCard
              label="Risk flags"
              value={criticalCount + atRiskCount}
              sub={`${criticalCount} critical · ${atRiskCount} at-risk`}
            />
            <KpiCard label="WHOOP live" value={whoopLive} sub="sync under 15s" />
            <KpiCard label="Health log entries" value={totalLogs} sub="all patients (this browser)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl bg-card/80 overflow-hidden border border-border/30" style={{ boxShadow: CARD_SHADOW }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                    <th className="p-3 font-semibold">Patient</th>
                    <th className="p-3 font-semibold hidden md:table-cell">Risk</th>
                    <th className="p-3 font-semibold">WHOOP</th>
                    <th className="p-3 font-semibold hidden sm:table-cell">Manual BP</th>
                    <th className="p-3 font-semibold hidden sm:table-cell">Docs</th>
                    <th className="p-3 font-semibold">Logs</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <PatientRow key={p.id} patient={p} live={rows.find((r) => r.patientId === p.id)} />
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="rounded-2xl bg-card/80 border border-border/30 p-5 space-y-4" style={{ boxShadow: CARD_SHADOW }}>
              <div className="flex items-center gap-2">
                <Watch className="size-4 text-primary" />
                <h2 className="font-bold font-display text-sm">Needs attention</h2>
              </div>
              {attention.length === 0 ? (
                <p className="text-xs text-muted-foreground">All patients stable on WHOOP. No new logs or messages.</p>
              ) : (
                <ul className="space-y-3">
                  {attention.slice(0, 3).map((item) => (
                    <li key={item.patientId} className="rounded-xl border border-border/30 p-3">
                      <p className="text-sm font-semibold">{patientName(item.patientId)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                      <Button variant="link" size="sm" className="h-auto p-0 mt-2" asChild>
                        <Link href={item.href}>Review</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

function PatientRow({
  patient,
  live,
}: {
  patient: PatientProfile
  live?: { risk: string; heartRate: number; spo2: number; lastSyncMs: number }
}) {
  const risk = live?.risk ?? "Normal"
  const docs = countDocumentLogs(patient.id)

  return (
    <tr className="border-b border-border/20 hover:bg-accent/20 transition-colors">
      <td className="p-3">
        <p className="font-medium">{patient.name}</p>
        <p className="text-[10px] font-mono text-muted-foreground">{patient.mrn}</p>
      </td>
      <td className="p-3 hidden md:table-cell">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${riskBadge(risk)}`}>{risk}</span>
      </td>
      <td className="p-3 font-mono text-xs">
        {live ? (
          <>
            {live.heartRate} bpm · {live.spo2.toFixed(0)}%
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="p-3 font-mono text-xs hidden sm:table-cell">{formatManualBp(patient.id)}</td>
      <td className="p-3 hidden sm:table-cell">
        {docs > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <FileText className="size-3" />
            {docs}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="p-3 font-mono text-xs">
        <PatientLogCount patientId={patient.id} />
      </td>
      <td className="p-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/doctor/patients/${encodeURIComponent(patient.id)}`}>
            Open
            <ChevronRight className="size-4 ml-1" />
          </Link>
        </Button>
      </td>
    </tr>
  )
}