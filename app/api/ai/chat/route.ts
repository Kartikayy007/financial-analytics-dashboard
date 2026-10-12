import { requireAuth } from "@/backend/auth"
import { chatReply } from "@/backend/mock-ai"
import type { AiChatRequest } from "@/backend/types"
import { jsonError, jsonOk } from "@/lib/api-response"

export async function POST(request: Request) {
  if (!requireAuth(request.headers.get("authorization"))) {
    return jsonError("Unauthorized", 401)
  }

  let body: AiChatRequest
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body", 400)
  }

  if (!body.message?.trim()) {
    return jsonError("message is required", 400)
  }

  const reply = chatReply(body.message.trim(), body.patientId)
  return jsonOk({ reply })
}
