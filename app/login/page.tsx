"use client"

import { useState } from "react"
import Link from "next/link"
import { Activity } from "lucide-react"
import type { LoginResponse } from "@/backend/types"
import type { ApiResponse } from "@/backend/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = useState("nurse@vitalwatch.demo")
  const [password, setPassword] = useState("demo123")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LoginResponse | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const json: ApiResponse<LoginResponse> = await res.json()
      if (!json.ok || !json.data) {
        setError(json.error ?? "Login failed")
        return
      }
      setResult(json.data)
      sessionStorage.setItem("vitalwatch_demo_token", json.data.token)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2 text-foreground">
          <Activity className="size-6 text-primary" />
          <span className="font-display font-bold text-lg">VitalWatch</span>
          <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">API demo</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in (WIP)</CardTitle>
            <CardDescription>
              Calls <code className="text-xs">POST /api/auth/login</code>. Not used to protect the dashboard.
            </CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-fin-loss">{error}</p>}
              {result && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono space-y-2 break-all">
                  <p className="text-muted-foreground font-sans text-[11px]">Token (saved to sessionStorage):</p>
                  <p>{result.token}</p>
                  <p className="text-muted-foreground font-sans text-[11px] mt-2">User:</p>
                  <pre>{JSON.stringify(result.user, null, 2)}</pre>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">Back to monitor</Link>
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Also try <Link href="/api/health" className="text-primary hover:underline">/api/health</Link> and{" "}
          <code className="text-[10px]">backend/README.md</code> in the repo.
        </p>
      </div>
    </main>
  )
}
