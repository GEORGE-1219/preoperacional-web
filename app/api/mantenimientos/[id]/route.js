import { cleanText, json, query } from "@/lib/db";
import { ensureMantenimientosSchema } from "@/lib/mantenimientos-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request, { params }) {
  await ensureMantenimientosSchema();
  const { id } = await params;
  const reportId = Number(cleanText(id, 20));

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return json({ success: false, mensaje: "Id de mantenimiento invalido." }, 400);
  }

  const rows = await query(
    `SELECT id,
            codigo,
            DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') fecha,
            DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') creadoEn,
            tipo_vehiculo tipoVehiculo,
            placa,
            nombre_responsable nombreResponsable,
            documento_responsable documentoResponsable,
            tipo_mantenimiento tipoMantenimiento,
            otro_tipo otroTipo,
            kilometraje,
            lugar,
            proveedor,
            costo,
            observaciones
       FROM mantenimientos_reportes
      WHERE id = :id
      LIMIT 1`,
    { id: reportId }
  );

  if (!rows.length) {
    return json({ success: false, mensaje: "Mantenimiento no encontrado." }, 404);
  }

  const fotos = await query(
    `SELECT id, etiqueta, mime_type mimeType, imagen_base64 imagenBase64
       FROM mantenimientos_fotos
      WHERE mantenimiento_id = :id
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
