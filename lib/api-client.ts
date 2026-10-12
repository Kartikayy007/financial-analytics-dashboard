const TOKEN_KEY = "vitalwatch_demo_token"

export async function getDemoApiToken(): Promise<string> {
  if (typeof window !== "undefined") {
    const existing = sessionStorage.getItem(TOKEN_KEY)
    if (existing) return existing
  }

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nurse@vitalwatch.demo",
      password: "demo123",
    }),
  })
  const json = await res.json()
  if (!json.ok || !json.data?.token) {
    throw new Error(json.error ?? "Login failed")
  }
  const token = json.data.token as string
  if (typeof window !== "undefined") {
    sessionStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export function clearDemoApiToken() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(TOKEN_KEY)
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const token = await getDemoApiToken()
  const headers = new Headers(options.headers)
  headers.set("Authorization", `Bearer ${token}`)
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json")
  }
  const res = await fetch(path, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  })
  const json = await res.json()
  if (!json.ok) {
    throw new Error(json.error ?? `Request failed (${res.status})`)
  }
  return json.data as T
}
