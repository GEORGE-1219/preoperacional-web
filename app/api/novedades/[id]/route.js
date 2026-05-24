import { cleanText, json, query } from "@/lib/db";
import { ensureNovedadesSchema } from "@/lib/novedades-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request, { params }) {
  await ensureNovedadesSchema();
  const { id } = await params;
  const reportId = Number(cleanText(id, 20));

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return json({ success: false, mensaje: "Id de novedad inválido." }, 400);
  }

  const rows = await query(
    `SELECT id,
            codigo,
            DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') fecha,
            DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') creadoEn,
            nombre_conductor nombreConductor,
            documento_conductor documentoConductor,
            tipo_vehiculo tipoVehiculo,
            placa,
            tipo_novedad tipoNovedad,
            otro_tipo otroTipo,
            lugar,
            latitud,
            longitud,
            observaciones
       FROM novedades_reportes
      WHERE id = :id
      LIMIT 1`,
    { id: reportId }
  );

  if (!rows.length) {
    return json({ success: false, mensaje: "Novedad no encontrada." }, 404);
  }

  const fotos = await query(
    `SELECT id, etiqueta, mime_type mimeType, imagen_base64 imagenBase64
       FROM novedades_fotos
      WHERE novedad_id = :id
      ORDER BY id ASC`,
    { id: reportId }
  );

  return json({
    ...rows[0],
    fotos: fotos.map((foto) => ({
      id: foto.id,
      etiqueta: foto.etiqueta,
      dataUrl: `data:${foto.mimeType};base64,${foto.imagenBase64}`
    }))
  });
}
