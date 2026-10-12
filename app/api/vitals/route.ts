import { requireAuth } from "@/backend/auth"
import { addVitalReading, getVitalsByPatient } from "@/backend/store"
import type { CreateVitalRequest, VitalsListResponse } from "@/backend/types"
import { jsonError, jsonOk } from "@/lib/api-response"

export async function GET(request: Request) {
  if (!requireAuth(request.headers.get("authorization"))) {
    return jsonError("Unauthorized", 401)
  }

  const patientId = new URL(request.url).searchParams.get("patientId")
  if (!patientId) {
    return jsonError("patientId query parameter is required", 400)
  }

  const readings = getVitalsByPatient(patientId)
  const data: VitalsListResponse = {
    patientId,
    latest: readings[0] ?? null,
    readings,
  }
  return jsonOk(data)
}

export async function POST(request: Request) {
  if (!requireAuth(request.headers.get("authorization"))) {
    return jsonError("Unauthorized", 401)
  }

  let body: CreateVitalRequest
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body", 400)
  }

  const required = ["patientId", "heartRate", "spo2", "systolic", "diastolic", "temperature"] as const
  for (const key of required) {
    if (body[key] === undefined || body[key] === null) {
      return jsonError(`${key} is required`, 400)
    }
  }

  if (body.diastolic >= body.systolic) {
    return jsonError("diastolic must be less than systolic", 400)
  }

  const reading = addVitalReading(body)
  return jsonOk(reading, 201)
}
