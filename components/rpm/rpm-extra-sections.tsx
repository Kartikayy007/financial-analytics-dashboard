"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "motion/react"
import {
  Activity,
  Calendar,
  Link2,
  MessageSquare,
  Pill,
  Stethoscope,
  Wifi,
  Battery,
} from "lucide-react"
import type { DoctorProfile, PatientProfile } from "@/lib/rpm-mock-data"
import { getCarePlan, getDevicesForPatient } from "@/lib/rpm-mock-data"
import { useLocalPatientStore } from "@/hooks/use-local-patient-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

const CARD_SHADOW =
  "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px"

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-card/80 backdrop-blur-sm p-5 lg:p-6 ${className}`}
      style={{ boxShadow: CARD_SHADOW }}
    >
      {children}
    </div>
  )
}

export function CarePlanSection({ patientId }: { patientId: string }) {
  const plan = getCarePlan(patientId)
  const { medTaken, toggleMed } = useLocalPatientStore(patientId)

  if (!plan) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">No care plan on file.</p>
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-10.5rem)]">
      <Panel>
        <div className="flex items-center gap-2 mb-4">
          <Pill className="size-5 text-primary" />
          <h2 className="text-lg font-bold font-display">Medications</h2>
        </div>
        <div className="space-y-3">
          {plan.medications.map((med) => {
            const taken = Boolean(medTaken[med.id])
            return (
              <div
                key={med.id}
                className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border/40"
              >
                <div>
                  <p className="font-semibold text-foreground">{med.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {med.dose} · {med.schedule}
                  </p>
                  {taken && (
                    <p className="text-[10px] text-fin-gain font-mono mt-1">
                      Logged {new Date(medTaken[med.id]).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button size="sm" variant={taken ? "secondary" : "default"} onClick={() => toggleMed(med.id)}>
                  {taken ? "Logged" : "Mark taken"}
                </Button>
              </div>
            )
          })}
        </div>
        {plan.medications.length === 0 && (
          <p className="text-sm text-muted-foreground">No active prescriptions.</p>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="size-5 text-primary" />
            <h3 className="font-bold font-display">Vital check schedule</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2">
            {plan.vitalCheckTimes.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                {t} — WHOOP auto-sync + manual log as needed
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="size-5 text-primary" />
            <h3 className="font-bold font-display">Next tele-visit</h3>
          </div>
          <p className="text-sm text-foreground font-medium">{plan.nextTelevisit}</p>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{plan.notes}</p>
        </Panel>
      </div>
    </div>
  )
}

export function MyDoctorSection({
  patient,
  doctor,
  onLink,
}: {
  patient: PatientProfile
  doctor: DoctorProfile | null
  onLink: (code: string) => boolean
}) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (doctor) {
    return (
      <div className="flex flex-col gap-5 min-h-[calc(100vh-10.5rem)]">
        <Panel>
          <div className="flex gap-4">
            <div className="size-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Stethoscope className="size-7 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Assigned physician</p>
              <h2 className="text-xl font-bold font-display">{doctor.name}</h2>
              <p className="text-sm text-muted-foreground">{doctor.department}</p>
              <p className="text-sm text-muted-foreground">{doctor.hospital}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 font-mono">Care team ID: {doctor.linkCode}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are enrolled in remote monitoring under {doctor.name}. WHOOP vitals, Health Log entries, and alerts are
            shared with your care team.
          </p>
        </Panel>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-10.5rem)]">
      <Panel>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-primary" />
            <h2 className="text-lg font-bold font-display">Link care team</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter the care team ID from your physician to share WHOOP and Health Log data.
          </p>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="link-code">Care team ID</Label>
            <Input
              id="link-code"
              placeholder="e.g. VW-DS-1042"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError(null)
                setSuccess(false)
              }}
            />
            {error && <p className="text-sm text-fin-loss">{error}</p>}
            {success && <p className="text-sm text-fin-gain">Successfully linked to your physician.</p>}
            <Button
              onClick={() => {
                const ok = onLink(code.trim())
                if (ok) setSuccess(true)
                else setError("Invalid care team ID. Check with your hospital.")
              }}
            >
              Link physician
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  )
}

export function DevicesSection({ patientId }: { patientId: string }) {
  const devices = getDevicesForPatient(patientId)
  const whoop = devices[0]

  if (!whoop) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">No device paired.</p>
      </Panel>
    )
  }

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-10.5rem)]">
      <Panel className="p-0 overflow-hidden">
        <Image src="/images/whoop-hero.svg" alt="" width={640} height={360} className="w-full h-40 object-cover" />
        <div className="p-5 lg:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Connected wearable</p>
              <p className="font-bold text-xl font-display">{whoop.model}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">{whoop.id}</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-fin-gain/40 text-fin-gain">
              Online
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Live HR and SpO₂ appear under Live Monitor. Log blood pressure, weight, ECG PDFs, and more in Health Log.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Battery className="size-3.5" />
                Battery
              </div>
              <Progress value={whoop.battery} className="h-2" />
              <p className="text-xs font-mono mt-1">{whoop.battery}%</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Wifi className="size-3.5" />
                Signal
              </div>
              <Progress value={whoop.signal} className="h-2" />
              <p className="text-xs font-mono mt-1">{whoop.signal}%</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Last sync · {Math.round(whoop.lastSyncMs / 1000)}s ago
          </p>
        </div>
      </Panel>
    </div>
  )
}

export function MessagesSection({ patientId, viewer }: { patientId: string; viewer: "doctor" | "patient" }) {
  const { messages, sendMessage } = useLocalPatientStore(patientId)
  const [draft, setDraft] = useState("")

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-10.5rem)]">
      <Panel className="flex-1 flex flex-col min-h-[400px]">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="size-5 text-primary" />
          <h2 className="text-lg font-bold font-display">Secure messages</h2>
        </div>
        <div className="flex-1 space-y-3 overflow-auto max-h-[420px] pr-1">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`rounded-xl px-4 py-3 text-sm max-w-[85%] ${
                m.from === viewer
                  ? "ml-auto bg-primary/15 text-foreground"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <p>{m.body}</p>
              <p className="text-[10px] font-mono mt-2 opacity-60">
                {new Date(m.sentAt).toLocaleString()}
              </p>
            </motion.div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Type a message to your care team…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                sendMessage(draft.trim(), viewer)
                setDraft("")
              }
            }}
          />
          <Button
            onClick={() => {
              if (!draft.trim()) return
              sendMessage(draft.trim(), viewer)
              setDraft("")
            }}
          >
            Send
          </Button>
        </div>
      </Panel>
    </div>
  )
}