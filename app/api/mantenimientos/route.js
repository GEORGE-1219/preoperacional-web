import { cleanText, json, normalizeTipo, query } from "@/lib/db";
import { ensureMantenimientosSchema } from "@/lib/mantenimientos-schema";
import { ensureVehicleSchema } from "@/lib/vehicle-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAINTENANCE_TYPES = new Set(["PREVENTIVO", "CORRECTIVO", "CAMBIO_ACEITE", "OTRO"]);
const MAX_PHOTO_BASE64_LENGTH = 1_600_000;

function parsePhoto(photo) {
  const dataUrl = String(photo?.dataUrl || "");
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  return {
    etiqueta: cleanText(photo.etiqueta || "Foto de mantenimiento", 120),
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
    base64: match[2]
  };
}

export async function GET(request) {
  await ensureMantenimientosSchema();
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
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY fecha_registro DESC
      LIMIT 500`,
    params
  );

  return json(rows);
}

export async function POST(request) {
  await ensureMantenimientosSchema();
  await ensureVehicleSchema();
  const body = await request.json().catch(() => ({}));

  const tipoVehiculo = normalizeTipo(body.tipoVehiculo);
  const placa = cleanText(body.placa, 20).toUpperCase();
  const nombreResponsable = cleanText(body.nombreResponsable, 160).toUpperCase();
  const documentoResponsable = cleanText(body.documentoResponsable, 20);
  const tipoMantenimiento = String(body.tipoMantenimiento || "").toUpperCase();
  const otroTipo = cleanText(body.otroTipo, 120).toUpperCase();
  const kilometraje = body.kilometraje === "" || body.kilometraje == null ? null : Number(body.kilometraje);
  const lugar = cleanText(body.lugar, 180).toUpperCase();
  const proveedor = cleanText(body.proveedor, 160).toUpperCase();
  const costo = body.costo === "" || body.costo == null ? null : Number(body.costo);
  const observaciones = cleanText(body.observaciones, 1400);
  const fotos = Array.isArray(body.fotos) ? body.fotos.map(parsePhoto).filter(Boolean) : [];

  const errors = [];
  if (!tipoVehiculo) errors.push("Seleccione el tipo de vehiculo.");
  if (!placa) errors.push("Seleccione la placa del vehiculo.");
  if (!nombreResponsable) errors.push("Ingrese el responsable del mantenimiento.");
  if (!/^[0-9]{6,12}$/.test(documentoResponsable)) errors.push("El documento debe tener entre 6 y 12 digitos.");
  if (!MAINTENANCE_TYPES.has(tipoMantenimiento)) errors.push("Seleccione un tipo de mantenimiento valido.");
  if (tipoMantenimiento === "OTRO" && !otroTipo) errors.push("Especifique el tipo de mantenimiento.");
  if (kilometraje !== null && (!Number.isInteger(kilometraje) || kilometraje < 0)) errors.push("Kilometraje no valido.");
  if (costo !== null && (!Number.isFinite(costo) || costo < 0)) errors.push("Costo no valido.");
  if (!lugar) errors.push("Ingrese el taller, lugar o sitio.");
  if (!observaciones) errors.push("Ingrese las observaciones del mantenimiento.");
  if (!fotos.length) errors.push("Suba al menos una foto de evidencia.");

  for (const foto of fotos) {
    if (foto.base64.length > MAX_PHOTO_BASE64_LENGTH) errors.push(`La foto ${foto.etiqueta} supera el tamano permitido.`);
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
    `INSERT INTO mantenimientos_reportes
      (tipo_vehiculo, placa, nombre_responsable, documento_responsable, tipo_mantenimiento, otro_tipo, kilometraje, lugar, proveedor, costo, observaciones)
     VALUES
      (:tipoVehiculo, :placa, :nombreResponsable, :documentoResponsable, :tipoMantenimiento, :otroTipo, :kilometraje, :lugar, :proveedor, :costo, :observaciones)`,
    {
      tipoVehiculo,
      placa,
      nombreResponsable,
      documentoResponsable,
      tipoMantenimiento,
      otroTipo: tipoMantenimiento === "OTRO" ? otroTipo : null,
      kilometraje,
      lugar,
      proveedor: proveedor || null,
      costo,
      observaciones
    }
  );
  const codigo = `MAN-${result.insertId < 10000 ? String(result.insertId).padStart(4, "0") : result.insertId}`;

  await query(
    "UPDATE mantenimientos_reportes SET codigo = :codigo WHERE id = :id LIMIT 1",
    { id: result.insertId, codigo }
  );

  for (const foto of fotos) {
    await query(
      `INSERT INTO mantenimientos_fotos (mantenimiento_id, etiqueta, mime_type, imagen_base64)
       VALUES (:mantenimientoId, :etiqueta, :mimeType, :base64)`,
      { mantenimientoId: result.insertId, ...foto }
    );
  }

  return json({ success: true, id: result.insertId, codigo, mensaje: `Mantenimiento ${codigo} guardado.` }, 201);
}
