import { cleanText, json, query } from "@/lib/db";
import { ensureConductoresSchema } from "@/lib/conductores";

export const dynamic = "force-dynamic";

export async function POST(request) {
  await ensureConductoresSchema();
  const body = await request.json().catch(() => ({}));
  const documento = cleanText(body.documento, 20);

  if (!/^[0-9]{6,12}$/.test(documento)) {
    return json({ autorizado: false, mensaje: "Documento inválido." }, 400);
  }

  const total = await query("SELECT COUNT(*) total FROM usuarios_autorizados WHERE activo = 1");
  const usuarios = await query(
    "SELECT nombre FROM usuarios_autorizados WHERE documento = :documento AND activo = 1 LIMIT 1",
    { documento }
  );

  if (!usuarios.length) {
    if (Number(total[0]?.total || 0) === 0) {
      return json({ autorizado: true, nombre: null, mensaje: "Validación abierta. Registra usuarios autorizados para restringir acceso." });
    }

    return json({ autorizado: false, mensaje: "Usuario no autorizado." }, 403);
  }

  return json({ autorizado: true, nombre: usuarios[0].nombre });
}
