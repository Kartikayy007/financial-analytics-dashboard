"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Sparkles, Send } from "lucide-react"
import type { VitalsSnapshot } from "@/lib/patient-vitals"
import type { AiAnalyzeResponse } from "@/backend/types"
import { apiFetch } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const PATIENT_ID = "P-2026-0847"

type ChatMessage = { role: "user" | "assistant"; content: string }

type AiAssistantSheetProps = {
  snapshot: VitalsSnapshot
}

export function AiAssistantSheet({ snapshot }: AiAssistantSheetProps) {
  const [open, setOpen] = useState(false)
  const [analysis, setAnalysis] = useState<AiAnalyzeResponse | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "VitalWatch mock assistant (WIP). Ask about risk, vitals, or the backend API.",
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadAnalysis = useCallback(async () => {
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const data = await apiFetch<AiAnalyzeResponse>("/api/ai/analyze", {
        method: "POST",
        json: {
          patientId: PATIENT_ID,
          vitals: {
            heartRate: snapshot.heartRate,
            spo2: snapshot.spo2,
            systolic: snapshot.systolic,
            diastolic: snapshot.diastolic,
            temperature: snapshot.temperature,
            risk: snapshot.risk,
          },
        },
      })
      setAnalysis(data)
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Analysis failed")
    } finally {
      setAnalysisLoading(false)
    }
  }, [snapshot])

  useEffect(() => {
    if (open) {
      loadAnalysis()
    }
  }, [open, loadAnalysis])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendChat = async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatInput("")
    setMessages((m) => [...m, { role: "user", content: text }])
    setChatLoading(true)
    try {
      const data = await apiFetch<{ reply: string }>("/api/ai/chat", {
        method: "POST",
        json: { message: text, patientId: PATIENT_ID },
      })
      setMessages((m) => [...m, { role: "assistant", content: data.reply }])
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Chat request failed",
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-accent/50 transition-all duration-200 border border-border/40"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="size-4 text-primary" />
          <span className="hidden sm:inline text-[13px] font-semibold text-foreground">AI Assistant</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-5 hidden sm:inline-flex">
            WIP
          </Badge>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 font-display">
            <Sparkles className="size-5 text-primary" />
            AI Assistant
            <Badge variant="outline" className="text-[10px]">WIP</Badge>
          </SheetTitle>
          <SheetDescription>
            Mock analysis and chat via <code className="text-xs">/api/ai/*</code> — not clinical advice.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="analysis" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 w-auto">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="flex-1 overflow-auto px-6 pb-6 mt-4 space-y-4">
            <div className="rounded-xl bg-chart-3/10 border border-chart-3/20 px-3 py-2 text-[11px] text-muted-foreground">
              Uses live monitor snapshot + backend mock AI. Monitor still runs client simulation.
            </div>
            {analysisLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
            {analysisError && (
              <p className="text-sm text-fin-loss">{analysisError}</p>
            )}
            {analysis && !analysisLoading && (
              <div className="space-y-4">
                <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                  {analysis.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground italic">{analysis.disclaimer}</p>
                <Button variant="outline" size="sm" onClick={loadAnalysis}>
                  Refresh analysis
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 px-6 pb-6 mt-4 gap-3">
            <ScrollArea className="flex-1 min-h-[280px] rounded-xl border border-border/50 p-3">
              <div ref={scrollRef} className="space-y-3 pr-2">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-sm rounded-xl px-3 py-2 max-w-[90%] ${
                      msg.role === "user"
                        ? "ml-auto bg-primary/15 text-foreground"
                        : "bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder="Ask about vitals, risk, or APIs…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                rows={2}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendChat()
                  }
                }}
              />
              <Button size="icon" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                <Send className="size-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
