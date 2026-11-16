"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "motion/react"
import { Activity, ChevronRight, LogOut, Users } from "lucide-react"
import { useLocalPatientStore } from "@/hooks/use-local-patient-store"
import { useRpmPatientRegistry } from "@/hooks/use-rpm-patient-registry"
import { useRpmSession } from "@/components/rpm/session-provider"
import { userInitials } from "@/lib/rpm-auth"
import { Button } from "@/components/ui/button"

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

export function DoctorDashboard() {
  const { session, signOut, linkedPatients } = useRpmSession()
  const doctorId = session?.user.doctorId
  const { rows } = useRpmPatientRegistry(doctorId)
  const initials = session ? userInitials(session.user.name) : "DR"

  const sorted = [...linkedPatients].sort((a, b) => {
    const ra = rows.find((r) => r.patientId === a.id)?.risk ?? "Normal"
    const rb = rows.find((r) => r.patientId === b.id)?.risk ?? "Normal"
    const rank = { Critical: 0, "At-Risk": 1, Normal: 2 }
    return rank[ra as keyof typeof rank] - rank[rb as keyof typeof rank]
  })

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="w-full px-5 lg:px-10 xl:px-14 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Activity className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-display font-bold">VitalWatch</p>
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Users className="size-6 text-primary" />
            <h1 className="text-2xl font-bold font-display">Remote patient roster</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            WHOOP live streams and patient-logged vitals on this device. Select a row for waveforms, Health Log, and
            VitalAI insights.
          </p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl overflow-hidden border border-border/30">
            <Image src="/images/care-hero.svg" alt="" width={640} height={200} className="w-full h-28 object-cover opacity-90" />
          </motion.div>

          <div
            className="rounded-2xl bg-card/80 overflow-hidden border border-border/30"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="p-4 font-semibold">Patient</th>
                  <th className="p-4 font-semibold">MRN</th>
                  <th className="p-4 font-semibold">Risk</th>
                  <th className="p-4 font-semibold">HR</th>
                  <th className="p-4 font-semibold">SpO₂</th>
                  <th className="p-4 font-semibold">BP</th>
                  <th className="p-4 font-semibold">Last sync</th>
                  <th className="p-4 font-semibold">Logs</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const live = rows.find((r) => r.patientId === p.id)
                  const risk = live?.risk ?? "Normal"
                  return (
                    <tr key={p.id} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                      <td className="p-4 font-medium">{p.name}</td>
                      <td className="p-4 font-mono text-muted-foreground">{p.mrn}</td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${riskBadge(risk)}`}>
                          {risk}
                        </span>
                      </td>
                      <td className="p-4 font-mono">{live?.heartRate ?? "—"}</td>
                      <td className="p-4 font-mono">{live?.spo2?.toFixed(1) ?? "—"}</td>
                      <td className="p-4 font-mono">{live ? `${live.systolic}/—` : "—"}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {live ? `${Math.round(live.lastSyncMs / 1000)}s ago` : "—"}
                      </td>
                      <td className="p-4 font-mono text-xs">
                        <PatientLogCount patientId={p.id} />
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/doctor/patients/${encodeURIComponent(p.id)}`}>
                            Open
                            <ChevronRight className="size-4 ml-1" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  )
}