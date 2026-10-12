import { requireAuth } from "@/backend/auth"
import { buildAnalysis, buildAnalysisFromReading } from "@/backend/mock-ai"
import { getVitalsByPatient } from "@/backend/store"
import type { AiAnalyzeRequest } from "@/backend/types"
import { jsonError, jsonOk } from "@/lib/api-response"

export async function POST(request: Request) {
  if (!requireAuth(request.headers.get("authorization"))) {
    return jsonError("Unauthorized", 401)
  }

  let body: AiAnalyzeRequest
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body", 400)
  }

  if (body.vitals) {
    const patientId = body.patientId ?? "P-2026-0847"
    return jsonOk(buildAnalysis(body.vitals, patientId))
  }

  const patientId = body.patientId
  if (!patientId) {
    return jsonError("patientId or vitals payload is required", 400)
  }

  const readings = getVitalsByPatient(patientId)
  const latest = readings[0]
  if (!latest) {
    return jsonError("No vitals found for patient", 404)
  }

  return jsonOk(buildAnalysisFromReading(latest))
}
