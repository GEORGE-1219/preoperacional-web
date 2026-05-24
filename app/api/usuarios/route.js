import { json } from "@/lib/db";
import { searchConductores } from "@/lib/conductores";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const conductores = await searchConductores(searchParams.get("q") || "");
  return json(conductores);
}
