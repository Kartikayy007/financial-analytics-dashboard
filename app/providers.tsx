"use client"

import { RpmSessionProvider } from "@/components/rpm/session-provider"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <RpmSessionProvider>{children}</RpmSessionProvider>
}