"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRpmSession } from "@/components/rpm/session-provider"
import type { RpmRole } from "@/lib/rpm-mock-data"
import { homePathForRole } from "@/lib/rpm-auth"

export function RoleGuard({
  role,
  children,
}: {
  role: RpmRole
  children: React.ReactNode
}) {
  const { session, loading } = useRpmSession()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!session) {
      router.replace("/login")
      return
    }
    if (session.user.role !== role) {
      router.replace(homePathForRole(session.user.role))
    }
  }, [loading, session, role, router])

  if (loading || !session || session.user.role !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    )
  }

  return <>{children}</>
}