import { json } from "@/lib/db";
import { getRegistros } from "@/lib/preoperacionales";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const registros = await getRegistros(Object.fromEntries(searchParams.entries()));
  return json(registros);
}
