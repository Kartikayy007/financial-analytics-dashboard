import { jsonOk } from "@/lib/api-response"

export async function GET() {
  return jsonOk({ status: "ok", version: "0.1.0-wip" })
}
