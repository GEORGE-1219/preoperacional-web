import { json } from "@/lib/db";
import { listConductoresBasicos, searchConductores } from "@/lib/conductores";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("all") === "1") {
    const conductores = await listConductoresBasicos();
    return json(conductores);
  }

  const conductores = await searchConductores(searchParams.get("q") || "");
  return json(conductores);
}
