"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { readSession, homePathForRole } from "@/lib/rpm-auth"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const session = readSession()
    if (!session) {
      router.replace("/login")
      return
    }
    router.replace(homePathForRole(session.user.role))
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Loading VitalWatch…
    </div>
  )
}