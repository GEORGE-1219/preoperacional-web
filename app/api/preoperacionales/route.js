import { cleanText, json, query } from "@/lib/db";
import { ensureEvidenceSchema } from "@/lib/evidence-schema";
import { createPreoperacional, ensurePreoperacionalConsecutivoSchema, validatePreoperacional } from "@/lib/preoperacionales";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = Number(cleanText(searchParams.get("id"), 20));

  if (!Number.isInteger(id) || id <= 0) {
    return json({ success: false, mensaje: "Id de preoperacional inválido." }, 400);
  }

  await ensureEvidenceSchema();
  await ensurePreoperacionalConsecutivoSchema();

  const registros = await query(
    `SELECT id, codigo, tipo_vehiculo tipo, DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') fecha,
            nombre_usuario usuario, documento_usuario documento, placa, modelo,
            sitio_destino destino, kilometraje, checklist, observaciones
       FROM preoperacionales
      WHERE id = :id
      LIMIT 1`,
    { id }
  );

  if (!registros.length) {
    return json({ success: false, mensaje: "Preoperacional no encontrado." }, 404);
  }

  const fotos = await query(
    `SELECT codigo, etiqueta, mime_type mimeType, imagen_base64 base64
       FROM preoperacional_fotos
      WHERE preoperacional_id = :id
      ORDER BY id ASC`,
    { id }
  );

  return json({
    ...registros[0],
    checklist: JSON.parse(registros[0].checklist || "{}"),
    fotos: fotos.map((foto) => ({
      codigo: foto.codigo,
      etiqueta: foto.etiqueta,
      dataUrl: `data:${foto.mimeType};base64,${foto.base64}`
    }))
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const parsed = validatePreoperacional(body);

  if (!parsed.ok) {
    return json({ success: false, mensaje: parsed.errors[0], errores: parsed.errors }, 400);
  }

  const created = await createPreoperacional(parsed.data);
  return json({ success: true, ...created, mensaje: `Preoperacional ${created.codigo} guardado exitosamente.` }, 201);
}
