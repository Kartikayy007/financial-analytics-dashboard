import { requireAuth } from "@/backend/auth"
import { getUserById } from "@/backend/store"
import { jsonError, jsonOk } from "@/lib/api-response"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  if (!requireAuth(request.headers.get("authorization"))) {
    return jsonError("Unauthorized", 401)
  }

  const { id } = await params
  const user = getUserById(id)
  if (!user) {
    return jsonError("User not found", 404)
  }
  return jsonOk(user)
}
