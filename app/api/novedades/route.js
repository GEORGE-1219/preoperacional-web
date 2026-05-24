import { cleanText, json, normalizeTipo, query } from "@/lib/db";
import { ensureNovedadesSchema } from "@/lib/novedades-schema";
import { ensureVehicleSchema } from "@/lib/vehicle-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NOVEDAD_TYPES = new Set(["DANO_GENERAL", "DANO_MOTOR", "ACCIDENTE_TRANSITO", "PINCHAZO", "OTRO"]);
const MAX_PHOTO_BASE64_LENGTH = 1_600_000;

function parsePhoto(photo) {
  const dataUrl = String(photo?.dataUrl || "");
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  return {
    etiqueta: cleanText(photo.etiqueta || "Foto de novedad", 120),
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
    base64: match[2]
  };
}

export async function GET(request) {
  await ensureNovedadesSchema();
  const { searchParams } = new URL(request.url);
  const tipoVehiculo = normalizeTipo(searchParams.get("tipoVehiculo"));
  const placa = cleanText(searchParams.get("placa"), 20).toUpperCase();
  const where = [];
  const params = {};

  if (searchParams.has("tipoVehiculo") && !tipoVehiculo) {
    return json({ success: false, mensaje: "Tipo de vehiculo no valido." }, 400);
  }

  if (tipoVehiculo) {
    where.push("tipo_vehiculo = :tipoVehiculo");
    params.tipoVehiculo = tipoVehiculo;
  }

  if (placa) {
    where.push("placa = :placa");
    params.placa = placa;
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
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY fecha_registro DESC
      LIMIT 500`,
    params
  );

  return json(rows);
}

export async function POST(request) {
  await ensureNovedadesSchema();
  await ensureVehicleSchema();
  const body = await request.json().catch(() => ({}));

  const nombreConductor = cleanText(body.nombreConductor, 160).toUpperCase();
  const documentoConductor = cleanText(body.documentoConductor, 20);
  const tipoVehiculo = normalizeTipo(body.tipoVehiculo);
  const placa = cleanText(body.placa, 20).toUpperCase();
  const tipoNovedad = String(body.tipoNovedad || "").toUpperCase();
  const otroTipo = cleanText(body.otroTipo, 120).toUpperCase();
  const lugar = cleanText(body.lugar, 180).toUpperCase();
  const observaciones = cleanText(body.observaciones, 1400);
  const latitud = body.latitud === "" || body.latitud == null ? null : Number(body.latitud);
  const longitud = body.longitud === "" || body.longitud == null ? null : Number(body.longitud);
  const fotos = Array.isArray(body.fotos) ? body.fotos.map(parsePhoto).filter(Boolean) : [];

  const errors = [];
  if (!tipoVehiculo) errors.push("Seleccione el tipo de vehiculo.");
  if (!placa) errors.push("Seleccione la placa del vehiculo.");
  if (!nombreConductor) errors.push("Ingrese el nombre del conductor.");
  if (!/^[0-9]{6,12}$/.test(documentoConductor)) errors.push("El documento debe tener entre 6 y 12 dígitos.");
  if (!NOVEDAD_TYPES.has(tipoNovedad)) errors.push("Seleccione un tipo de novedad válido.");
  if (tipoNovedad === "OTRO" && !otroTipo) errors.push("Especifique el tipo de novedad.");
  if (!lugar) errors.push("Ingrese el lugar o sitio de la novedad.");
  if (!observaciones) errors.push("Ingrese las observaciones generales.");
  if (latitud !== null && (!Number.isFinite(latitud) || latitud < -90 || latitud > 90)) errors.push("Latitud no válida.");
  if (longitud !== null && (!Number.isFinite(longitud) || longitud < -180 || longitud > 180)) errors.push("Longitud no válida.");
  if (!fotos.length) errors.push("Suba al menos una foto de la novedad.");

  for (const foto of fotos) {
    if (foto.base64.length > MAX_PHOTO_BASE64_LENGTH) errors.push(`La foto ${foto.etiqueta} supera el tamaño permitido.`);
  }

  if (tipoVehiculo && placa) {
    const vehicleRows = await query(
      "SELECT COUNT(*) total FROM vehiculos WHERE tipo = :tipoVehiculo AND placa = :placa AND activo = 1",
      { tipoVehiculo, placa }
    );
    if (!Number(vehicleRows[0]?.total || 0)) {
      errors.push("La placa seleccionada no esta activa para el tipo de vehiculo indicado.");
    }
  }

  if (errors.length) {
    return json({ success: false, mensaje: errors[0], errors }, 400);
  }

  const result = await query(
    `INSERT INTO novedades_reportes
      (nombre_conductor, documento_conductor, tipo_vehiculo, placa, tipo_novedad, otro_tipo, lugar, latitud, longitud, observaciones)
     VALUES
      (:nombreConductor, :documentoConductor, :tipoVehiculo, :placa, :tipoNovedad, :otroTipo, :lugar, :latitud, :longitud, :observaciones)`,
    { nombreConductor, documentoConductor, tipoVehiculo, placa, tipoNovedad, otroTipo: tipoNovedad === "OTRO" ? otroTipo : null, lugar, latitud, longitud, observaciones }
  );
  const codigo = `NOV-${result.insertId < 10000 ? String(result.insertId).padStart(4, "0") : result.insertId}`;

  await query(
    "UPDATE novedades_reportes SET codigo = :codigo WHERE id = :id LIMIT 1",
    { id: result.insertId, codigo }
  );

  for (const foto of fotos) {
    await query(
      `INSERT INTO novedades_fotos (novedad_id, etiqueta, mime_type, imagen_base64)
       VALUES (:novedadId, :etiqueta, :mimeType, :base64)`,
      { novedadId: result.insertId, ...foto }
    );
  }

  return json({ success: true, id: result.insertId, codigo, mensaje: `Reporte de novedad ${codigo} guardado.` }, 201);
}
