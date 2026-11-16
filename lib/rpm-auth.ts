import { findUserByEmail, toPublicUser, type RpmRole, type RpmUser } from "@/lib/rpm-mock-data"

const SESSION_KEY = "vitalwatch_session"

export type RpmSession = {
  user: RpmUser
  signedInAt: string
}

export function login(email: string, password: string): RpmSession | null {
  const record = findUserByEmail(email)
  if (!record || record.password !== password) return null
  return {
    user: toPublicUser(record),
    signedInAt: new Date().toISOString(),
  }
}

export function persistSession(session: RpmSession): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function readSession(): RpmSession | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as RpmSession
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(SESSION_KEY)
}

export function homePathForRole(role: RpmRole): string {
  return role === "doctor" ? "/doctor" : "/patient"
}

export function userInitials(name: string): string {
  const parts = name.replace(/^Dr\.\s*/i, "").trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}