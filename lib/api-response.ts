import { NextResponse } from "next/server"
import type { ApiResponse } from "@/backend/types"

export function jsonOk<T>(data: T, status = 200) {
  const body: ApiResponse<T> = { ok: true, data }
  return NextResponse.json(body, { status })
}

export function jsonError(error: string, status = 400) {
  const body: ApiResponse<never> = { ok: false, error }
  return NextResponse.json(body, { status })
}
