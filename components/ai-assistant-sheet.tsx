"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Sparkles, Send } from "lucide-react"
import type { VitalsSnapshot } from "@/lib/patient-vitals"
import {
  buildAnalysisFromSnapshot,
  chatReply,
  delayAnalysis,
  type AiAnalyzeResponse,
} from "@/lib/rpm-ai"
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

type ChatMessage = { role: "user" | "assistant"; content: string }

type AiAssistantSheetProps = {
  snapshot: VitalsSnapshot
  patientId: string
}

export function AiAssistantSheet({ snapshot, patientId }: AiAssistantSheetProps) {
  const [open, setOpen] = useState(false)
  const [analysis, setAnalysis] = useState<AiAnalyzeResponse | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I'm VitalAI, your clinical decision support assistant. Ask about vitals, risk, medications, or trends.",
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadAnalysis = useCallback(async () => {
    setAnalysisLoading(true)
    try {
      await delayAnalysis()
      setAnalysis(buildAnalysisFromSnapshot(snapshot, patientId))
    } finally {
      setAnalysisLoading(false)
    }
  }, [snapshot, patientId])

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
      await delayAnalysis(280)
      setMessages((m) => [...m, { role: "assistant", content: chatReply(text, patientId) }])
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
          aria-label="Open VitalAI"
        >
          <Sparkles className="size-4 text-primary" />
          <span className="hidden sm:inline text-[13px] font-semibold text-foreground">VitalAI</span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 font-display">
            <Sparkles className="size-5 text-primary" />
            VitalAI
          </SheetTitle>
          <SheetDescription>
            Clinical decision support from live vitals — for care team review, not a standalone diagnosis.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="analysis" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 w-auto">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="flex-1 overflow-auto px-6 pb-6 mt-4 space-y-4">
            {analysisLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
            {analysis && !analysisLoading && (
              <div className="space-y-4">
                <p className="text-xs font-mono text-muted-foreground">
                  Model confidence {(analysis.confidence * 100).toFixed(0)}%
                </p>
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
                placeholder="Ask about vitals, risk, or care plan…"
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