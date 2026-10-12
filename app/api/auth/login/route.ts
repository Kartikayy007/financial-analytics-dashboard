import { validateLogin } from "@/backend/auth"
import type { LoginRequest } from "@/backend/types"
import { jsonError, jsonOk } from "@/lib/api-response"

export async function POST(request: Request) {
  let body: LoginRequest
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body", 400)
  }

  if (!body.email || !body.password) {
    return jsonError("email and password are required", 400)
  }

  const result = validateLogin(body.email, body.password)
  if (!result) {
    return jsonError("Invalid email or password", 401)
  }

  return jsonOk(result)
}
