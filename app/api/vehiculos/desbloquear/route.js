import { cleanText, json, normalizeTipo, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const tipo = normalizeTipo(body.tipo);
  const placa = cleanText(body.placa, 20).toUpperCase();

  if (!tipo || !placa) {
    return json({ success: false, mensaje: "Tipo y placa son obligatorios." }, 400);
  }

  const result = await query(
    `UPDATE preoperacionales
        SET liberado_en = NOW()
      WHERE tipo_vehiculo = :tipo
        AND placa = :placa
        AND DATE(fecha_registro) = CURRENT_DATE()
        AND liberado_en IS NULL
      ORDER BY fecha_registro DESC
      LIMIT 1`,
    { tipo, placa }
  );

  if (!result.affectedRows) {
    return json({ success: false, mensaje: "No se encontró registro activo para esta placa hoy." }, 404);
  }

  return json({ success: true, mensaje: "Vehículo desbloqueado exitosamente." });
}
