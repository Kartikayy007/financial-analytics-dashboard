"use client"

import { useEffect, useState } from "react"

export function ClientOnlyChart({
  children,
  className = "min-h-[220px] w-full",
}: {
  children: React.ReactNode
  className?: string
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) {
    return <div className={`${className} rounded-xl bg-muted/20 animate-pulse`} aria-hidden />
  }
  return <div className={className}>{children}</div>
}