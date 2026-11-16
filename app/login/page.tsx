"use client"

import { useState } from "react"
import Image from "next/image"
import { Activity } from "lucide-react"
import { login } from "@/lib/rpm-auth"
import { useRpmSession } from "@/components/rpm/session-provider"
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
  const { signIn } = useRpmSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const session = login(email.trim(), password)
    if (!session) {
      setError("Invalid email or password. Contact your care administrator.")
      setLoading(false)
      return
    }
    signIn(session)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-48 pointer-events-none opacity-50">
        <Image src="/images/care-hero.svg" alt="" width={640} height={200} className="w-full h-full object-cover" priority />
      </div>
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex flex-col items-center gap-2 text-foreground">
          <div className="size-12 rounded-2xl bg-primary/15 flex items-center justify-center glow-teal-sm">
            <Activity className="size-6 text-primary" />
          </div>
          <span className="font-display font-bold text-xl">VitalWatch</span>
          <span className="text-sm text-muted-foreground">Remote patient monitoring</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Physician or patient portal — secure session on this device.</CardDescription>
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
                  required
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
                  required
                />
              </div>
              {error && <p className="text-sm text-fin-loss">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}