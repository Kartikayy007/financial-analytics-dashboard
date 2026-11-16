"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import {
  Activity,
  FileText,
  Footprints,
  HeartPulse,
  ImageIcon,
  NotebookPen,
  Trash2,
} from "lucide-react"
import { useLocalPatientStore } from "@/hooks/use-local-patient-store"
import type { DocumentKind, HealthLogEntry } from "@/lib/rpm-local-store"
import { validateDocumentSize } from "@/lib/rpm-local-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

const CARD_SHADOW =
  "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px"

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-card/80 backdrop-blur-sm p-5 lg:p-6 ${className}`} style={{ boxShadow: CARD_SHADOW }}>
      {children}
    </div>
  )
}

function logSummary(entry: HealthLogEntry): string {
  switch (entry.kind) {
    case "manual_vitals": {
      const parts: string[] = []
      if (entry.systolic && entry.diastolic) parts.push(`BP ${entry.systolic}/${entry.diastolic}`)
      if (entry.heartRate) parts.push(`HR ${entry.heartRate}`)
      if (entry.spo2) parts.push(`SpO₂ ${entry.spo2}%`)
      if (entry.weightKg) parts.push(`${entry.weightKg} kg`)
      if (entry.glucoseMgDl) parts.push(`Glucose ${entry.glucoseMgDl} mg/dL`)
      return parts.join(" · ") || "Vitals logged"
    }
    case "symptom":
      return `${entry.text} (severity ${entry.severity}/5)`
    case "activity": {
      const p: string[] = []
      if (entry.steps) p.push(`${entry.steps} steps`)
      if (entry.sleepHours) p.push(`${entry.sleepHours}h sleep`)
      if (entry.strain) p.push(`strain ${entry.strain}`)
      return p.join(" · ") || "Activity logged"
    }
    case "document":
      return `${entry.docKind.replace("_", " ")} · ${entry.fileName}`
    case "note":
      return entry.text
  }
}

export function HealthLogSection({
  patientId,
  readOnly = false,
}: {
  patientId: string
  readOnly?: boolean
}) {
  const { logs, addLog, deleteLog } = useLocalPatientStore(patientId)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ title: string; dataUrl: string; mimeType: string } | null>(null)

  const [vitals, setVitals] = useState({ hr: "", spo2: "", sys: "", dia: "", temp: "", weight: "", glucose: "" })
  const [symptom, setSymptom] = useState({ text: "", severity: [3] })
  const [activity, setActivity] = useState({ steps: "", sleep: "", strain: "" })
  const [note, setNote] = useState("")
  const [doc, setDoc] = useState<{ kind: DocumentKind; note: string; fileName: string; mimeType: string; dataUrl: string } | null>(null)

  const documents = useMemo(() => logs.filter((l) => l.kind === "document"), [logs])

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const check = validateDocumentSize(dataUrl)
      if (!check.ok) {
        setError(check.error ?? "File too large")
        return
      }
      setDoc({
        kind: file.type.includes("pdf") ? "ecg_pdf" : "lab_report",
        note: "",
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl,
      })
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const save = (entry: Omit<HealthLogEntry, "id" | "patientId">) => {
    addLog(entry)
    setSuccess("Saved to your health record.")
    setError(null)
    setTimeout(() => setSuccess(null), 2500)
  }

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-10.5rem)]">
      <Panel className="overflow-hidden p-0">
        <div className="relative">
          <Image
            src="/images/care-hero.svg"
            alt=""
            width={640}
            height={200}
            className="w-full h-32 object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/95 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-lg font-bold font-display text-foreground">Health Log</h2>
            <p className="text-xs text-muted-foreground">
              WHOOP handles live stream · log vitals, activity, symptoms, ECG PDFs, and notes here.
            </p>
          </div>
        </div>
      </Panel>

      {!readOnly && (
        <Panel>
          <Tabs defaultValue="vitals">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="symptom">Symptoms</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="vitals" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(
                  [
                    ["hr", "Heart rate (bpm)"],
                    ["spo2", "SpO₂ (%)"],
                    ["sys", "Systolic"],
                    ["dia", "Diastolic"],
                    ["temp", "Temp (°C)"],
                    ["weight", "Weight (kg)"],
                    ["glucose", "Glucose (mg/dL)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      value={vitals[key]}
                      onChange={(e) => setVitals((v) => ({ ...v, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <Button
                onClick={() =>
                  save({
                    kind: "manual_vitals",
                    recordedAt: new Date().toISOString(),
                    heartRate: vitals.hr ? Number(vitals.hr) : undefined,
                    spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
                    systolic: vitals.sys ? Number(vitals.sys) : undefined,
                    diastolic: vitals.dia ? Number(vitals.dia) : undefined,
                    temperature: vitals.temp ? Number(vitals.temp) : undefined,
                    weightKg: vitals.weight ? Number(vitals.weight) : undefined,
                    glucoseMgDl: vitals.glucose ? Number(vitals.glucose) : undefined,
                  })
                }
              >
                Save vitals
              </Button>
            </TabsContent>

            <TabsContent value="symptom" className="space-y-3 mt-4">
              <Textarea value={symptom.text} onChange={(e) => setSymptom((s) => ({ ...s, text: e.target.value }))} placeholder="Describe how you feel…" />
              <Label className="text-xs">Severity {symptom.severity[0]}/5</Label>
              <Slider value={symptom.severity} onValueChange={(v) => setSymptom((s) => ({ ...s, severity: v }))} min={1} max={5} step={1} />
              <Button
                disabled={!symptom.text.trim()}
                onClick={() =>
                  save({
                    kind: "symptom",
                    recordedAt: new Date().toISOString(),
                    text: symptom.text.trim(),
                    severity: symptom.severity[0],
                  })
                }
              >
                Log symptom
              </Button>
            </TabsContent>

            <TabsContent value="activity" className="space-y-3 mt-4">
              <div className="grid grid-cols-3 gap-3">
                <NumberField label="Steps" value={activity.steps} onChange={(v) => setActivity((a) => ({ ...a, steps: v }))} />
                <NumberField label="Sleep (hours)" value={activity.sleep} onChange={(v) => setActivity((a) => ({ ...a, sleep: v }))} />
                <NumberField label="Strain (0–21)" value={activity.strain} onChange={(v) => setActivity((a) => ({ ...a, strain: v }))} />
              </div>
              <Button
                onClick={() =>
                  save({
                    kind: "activity",
                    recordedAt: new Date().toISOString(),
                    steps: activity.steps ? Number(activity.steps) : undefined,
                    sleepHours: activity.sleep ? Number(activity.sleep) : undefined,
                    strain: activity.strain ? Number(activity.strain) : undefined,
                  })
                }
              >
                Save activity
              </Button>
            </TabsContent>

            <TabsContent value="documents" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label>Upload ECG PDF or image</Label>
                <Input type="file" accept=".pdf,image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
                {doc && <p className="text-xs text-muted-foreground font-mono">{doc.fileName}</p>}
                <Textarea
                  placeholder="Optional note for clinician…"
                  value={doc?.note ?? ""}
                  onChange={(e) => doc && setDoc({ ...doc, note: e.target.value })}
                />
              </div>
              <Button
                disabled={!doc}
                onClick={() => {
                  if (!doc) return
                  save({
                    kind: "document",
                    recordedAt: new Date().toISOString(),
                    docKind: doc.kind,
                    fileName: doc.fileName,
                    mimeType: doc.mimeType,
                    dataUrl: doc.dataUrl,
                    note: doc.note,
                  })
                  setDoc(null)
                }}
              >
                Attach record
              </Button>
            </TabsContent>

            <TabsContent value="notes" className="space-y-3 mt-4">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="General note for your care file…" />
              <Button
                disabled={!note.trim()}
                onClick={() => {
                  save({ kind: "note", recordedAt: new Date().toISOString(), text: note.trim() })
                  setNote("")
                }}
              >
                Save note
              </Button>
            </TabsContent>
          </Tabs>
          {error && <p className="text-sm text-fin-loss mt-2">{error}</p>}
          {success && <p className="text-sm text-fin-gain mt-2">{success}</p>}
        </Panel>
      )}

      {documents.length > 0 && (
        <Panel>
          <h3 className="font-bold font-display mb-3 flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" />
            Records gallery
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {documents.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setPreview({ title: d.fileName, dataUrl: d.dataUrl, mimeType: d.mimeType })}
                className="rounded-xl border border-border/40 p-3 text-left hover:bg-accent/20 transition-colors"
              >
                {d.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.dataUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
                ) : (
                  <div className="h-24 rounded-lg bg-muted/40 flex items-center justify-center mb-2">
                    <FileText className="size-8 text-primary" />
                  </div>
                )}
                <p className="text-xs font-semibold truncate">{d.fileName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{new Date(d.recordedAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <h3 className="font-bold font-display mb-3">Timeline</h3>
        <div className="space-y-2 max-h-[420px] overflow-auto">
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground">No entries yet. Add vitals or upload an ECG PDF above.</p>
          )}
          {logs.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/30">
              <EntryIcon entry={entry} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{logSummary(entry)}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1">
                  {new Date(entry.recordedAt).toLocaleString()}
                </p>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => deleteLog(entry.id)} aria-label="Delete">
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Dialog open={Boolean(preview)} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview?.mimeType.includes("pdf") ? (
            <iframe src={preview.dataUrl} title="Document preview" className="w-full h-[60vh] rounded-lg border border-border/40" />
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.dataUrl} alt="" className="w-full max-h-[60vh] object-contain rounded-lg" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function EntryIcon({ entry }: { entry: HealthLogEntry }) {
  const cls = "size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"
  switch (entry.kind) {
    case "manual_vitals":
      return (
        <div className={cls}>
          <HeartPulse className="size-4 text-primary" />
        </div>
      )
    case "activity":
      return (
        <div className={cls}>
          <Footprints className="size-4 text-primary" />
        </div>
      )
    case "document":
      return (
        <div className={cls}>
          <FileText className="size-4 text-primary" />
        </div>
      )
    case "symptom":
      return (
        <div className={cls}>
          <Activity className="size-4 text-primary" />
        </div>
      )
    default:
      return (
        <div className={cls}>
          <NotebookPen className="size-4 text-primary" />
        </div>
      )
  }
}