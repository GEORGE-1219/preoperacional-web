import { ensureAssignmentSchema } from "@/lib/assignment-schema";
import { cleanText, json, normalizeTipo, query } from "@/lib/db";
import { ensureVehicleSchema } from "@/lib/vehicle-schema";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tipo = normalizeTipo(searchParams.get("tipo"));
  const placa = cleanText(searchParams.get("placa"), 20).toUpperCase();

  if (!tipo || !placa) {
    return json({ success: false, mensaje: "Tipo y placa son obligatorios." }, 400);
  }

  await ensureVehicleSchema();
  await ensureAssignmentSchema();

  const rows = await query(
    `SELECT id, tipo_vehiculo tipo, placa,
            conductor_nombre conductorNombre,
            conductor_documento conductorDocumento,
            observaciones,
            DATE_FORMAT(fecha_inicio, '%Y-%m-%d %H:%i:%s') fechaInicio,
            DATE_FORMAT(fecha_fin, '%Y-%m-%d %H:%i:%s') fechaFin
       FROM vehiculo_asignaciones
      WHERE tipo_vehiculo = :tipo
        AND placa = :placa
      ORDER BY fecha_inicio DESC`,
    { tipo, placa }
  );

  return json(rows.map((row) => ({ ...row, activo: !row.fechaFin })));
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const tipo = normalizeTipo(body.tipo);
  const placa = cleanText(body.placa, 20).toUpperCase();
  const conductorNombre = cleanText(body.conductorNombre, 160).toUpperCase();
  const conductorDocumento = cleanText(body.conductorDocumento, 20);
  const observaciones = cleanText(body.observaciones, 1000);

  if (!tipo || !placa) {
    return json({ success: false, mensaje: "Tipo y placa son obligatorios." }, 400);
  }

  if (!conductorNombre) {
    return json({ success: false, mensaje: "El nombre del conductor es obligatorio." }, 400);
  }

  await ensureVehicleSchema();
  await ensureAssignmentSchema();

  await query(
    `UPDATE vehiculo_asignaciones
        SET fecha_fin = NOW()
      WHERE tipo_vehiculo = :tipo
        AND placa = :placa
        AND fecha_fin IS NULL`,
    { tipo, placa }
  );

  await query(
    `INSERT INTO vehiculo_asignaciones
      (tipo_vehiculo, placa, conductor_nombre, conductor_documento, observaciones)
     VALUES
      (:tipo, :placa, :conductorNombre, :conductorDocumento, :observaciones)`,
    { tipo, placa, conductorNombre, conductorDocumento, observaciones }
  );

  await query(
    `UPDATE vehiculos
        SET responsable = :conductorNombre
      WHERE tipo = :tipo
        AND placa = :placa
      LIMIT 1`,
    { tipo, placa, conductorNombre }
  );

  return json({ success: true, mensaje: "Conductor asignado correctamente." }, 201);
}
