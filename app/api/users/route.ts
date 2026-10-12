import { requireAuth } from "@/backend/auth"
import { createUser, listUsers } from "@/backend/store"
import type { CreateUserRequest } from "@/backend/types"
import { jsonError, jsonOk } from "@/lib/api-response"

export async function GET(request: Request) {
  if (!requireAuth(request.headers.get("authorization"))) {
    return jsonError("Unauthorized", 401)
  }
  return jsonOk(listUsers())
}

export async function POST(request: Request) {
  if (!requireAuth(request.headers.get("authorization"))) {
    return jsonError("Unauthorized", 401)
  }

  let body: CreateUserRequest
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body", 400)
  }

  if (!body.name || !body.email || !body.password || !body.role) {
    return jsonError("name, email, password, and role are required", 400)
  }

  try {
    const user = createUser(body)
    return jsonOk(user, 201)
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create user", 409)
  }
}
