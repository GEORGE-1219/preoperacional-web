import { json } from "@/lib/db";
import { listConductores, saveConductor, setConductorActivo } from "@/lib/conductores";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const conductores = await listConductores({ includeInactive: true });
  return json(conductores);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  try {
    const conductor = await saveConductor(body);
    return json({ success: true, conductor, mensaje: "Conductor guardado correctamente." }, 201);
  } catch (error) {
    return json({ success: false, mensaje: error.message }, 400);
  }
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);

  if (!Number.isInteger(id) || id <= 0) {
    return json({ success: false, mensaje: "Id de conductor invalido." }, 400);
  }

  await setConductorActivo(id, Boolean(body.activo));
  return json({ success: true, mensaje: "Estado del conductor actualizado." });
}
