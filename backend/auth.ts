import { getUserByEmail, issueToken, isTokenValid } from "./store"
import type { LoginResponse, User } from "./types"

export function validateLogin(email: string, password: string): LoginResponse | null {
  const record = getUserByEmail(email)
  if (!record || record.password !== password) return null
  const { password: _, ...user } = record
  const token = issueToken(user.id)
  return { token, user: user as User }
}

export function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null
  const token = authHeader.slice(7).trim()
  return isTokenValid(token) ? token : null
}

export function requireAuth(authHeader: string | null): boolean {
  const token = parseBearerToken(authHeader)
  return token !== null
}
