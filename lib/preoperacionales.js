import { checklistKeys, checklistOptions } from "./checklist";
import { cleanText, normalizeTipo, query } from "./db";
import { ensureEvidenceSchema } from "./evidence-schema";
import { analyzeInspection } from "./inspection-analysis";
import { photoRequirements } from "./photo-requirements";

const MAX_PHOTO_BASE64_LENGTH = 1_600_000;

async function columnExists(tableName, columnName) {
  const rows = await query(
    `SELECT COUNT(*) total
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
        AND COLUMN_NAME = :columnName`,
    { tableName, columnName }
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function indexExists(tableName, indexName) {
  const rows = await query(
    `SELECT COUNT(*) total
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
        AND INDEX_NAME = :indexName`,
    { tableName, indexName }
  );
  return Number(rows[0]?.total || 0) > 0;
}

export function preoperacionalCode(id) {
  return `PRE-${id < 100 ? String(id).padStart(2, "0") : id}`;
}

export async function ensurePreoperacionalConsecutivoSchema() {
  if (!(await columnExists("preoperacionales", "codigo"))) {
    await query("ALTER TABLE preoperacionales ADD COLUMN codigo VARCHAR(24) NULL AFTER id");
  }

  await query(`
    UPDATE preoperacionales
       SET codigo = CONCAT('PRE-', IF(id < 100, LPAD(id, 2, '0'), id))
     WHERE codigo IS NULL OR codigo = ''
  `);

  if (!(await indexExists("preoperacionales", "uk_preoperacionales_codigo"))) {
    await query("ALTER TABLE preoperacionales ADD UNIQUE KEY uk_preoperacionales_codigo (codigo)");
  }
}

function parsePhoto(photo) {
  const dataUrl = String(photo?.dataUrl || "");
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);

  if (!match) return null;

  return {
    codigo: cleanText(photo.codigo, 80),
    etiqueta: cleanText(photo.etiqueta, 120),
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
    base64: match[2]
  };
}

export function validatePreoperacional(input) {
  const tipo = normalizeTipo(input.tipoVehiculo);
  const errors = [];

  if (!tipo) errors.push("Tipo de vehículo no válido.");
  if (!cleanText(input.nombreUsuario, 160)) errors.push("El nombre es obligatorio.");
  if (!/^[0-9]{6,12}$/.test(String(input.documentoUsuario || ""))) errors.push("Documento inválido.");
  if (!cleanText(input.placa, 20)) errors.push("La placa es obligatoria.");
  if (!cleanText(input.sitioDestino, 160)) errors.push("El sitio de destino es obligatorio.");
  if (!Number.isInteger(Number(input.kilometraje)) || Number(input.kilometraje) < 0) errors.push("Kilometraje inválido.");

  const checklist = {};
  if (tipo) {
    const validStatus = new Set(checklistOptions(tipo));

    for (const key of checklistKeys(tipo)) {
      if (!validStatus.has(input[key])) errors.push(`Checklist incompleto: ${key}.`);
      checklist[key] = input[key];
    }
  }

  const fotos = Array.isArray(input.fotos) ? input.fotos.map(parsePhoto).filter(Boolean) : [];
  const requiredPhotos = tipo ? photoRequirements(tipo) : [];
  for (const [codigo, etiqueta] of requiredPhotos) {
    const photo = fotos.find((item) => item.codigo === codigo);
    if (!photo) errors.push(`Falta subir evidencia fotográfica: ${etiqueta}.`);
  }

  for (const photo of fotos) {
    if (!photo.codigo || !photo.etiqueta) errors.push("Hay una evidencia fotográfica sin identificación.");
    if (photo.base64.length > MAX_PHOTO_BASE64_LENGTH) errors.push(`La foto ${photo.etiqueta} supera el tamaño permitido.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    data: {
      tipo,
      nombreUsuario: cleanText(input.nombreUsuario, 160),
      documentoUsuario: cleanText(input.documentoUsuario, 20),
      placa: cleanText(input.placa, 20).toUpperCase(),
      modelo: cleanText(input.modelo, 80),
      sitioDestino: cleanText(input.sitioDestino, 160),
      kilometraje: Number(input.kilometraje),
      observaciones: cleanText(input.observaciones, 1000),
      checklist,
      fotos
    }
  };
}

export async function createPreoperacional(data) {
  await ensureEvidenceSchema();
  await ensurePreoperacionalConsecutivoSchema();

  const result = await query(
    `INSERT INTO preoperacionales
      (tipo_vehiculo, nombre_usuario, documento_usuario, placa, modelo, sitio_destino, kilometraje, checklist, observaciones)
     VALUES
      (:tipo, :nombreUsuario, :documentoUsuario, :placa, :modelo, :sitioDestino, :kilometraje, :checklist, :observaciones)`,
    {
      ...data,
      checklist: JSON.stringify(data.checklist)
    }
  );

  const preoperacionalId = result.insertId;
  const codigo = preoperacionalCode(preoperacionalId);

  await query(
    "UPDATE preoperacionales SET codigo = :codigo WHERE id = :id LIMIT 1",
    { id: preoperacionalId, codigo }
  );

  for (const foto of data.fotos || []) {
    await query(
      `INSERT INTO preoperacional_fotos
        (preoperacional_id, codigo, etiqueta, mime_type, imagen_base64)
       VALUES
        (:preoperacionalId, :codigo, :etiqueta, :mimeType, :base64)`,
      {
        preoperacionalId,
        codigo: foto.codigo,
        etiqueta: foto.etiqueta,
        mimeType: foto.mimeType,
        base64: foto.base64
      }
    );
  }

  return { id: preoperacionalId, codigo };
}

export async function getRegistros(filtros = {}) {
  await ensurePreoperacionalConsecutivoSchema();

  const where = [];
  const params = {};

  const tipo = normalizeTipo(filtros.tipoVehiculo);
  if (tipo) {
    where.push("tipo_vehiculo = :tipo");
    params.tipo = tipo;
  }

  if (filtros.fechaInicio) {
    where.push("fecha_registro >= :fechaInicio");
    params.fechaInicio = `${filtros.fechaInicio} 00:00:00`;
  }

  if (filtros.fechaFin) {
    where.push("fecha_registro <= :fechaFin");
    params.fechaFin = `${filtros.fechaFin} 23:59:59`;
  }

  if (filtros.placa) {
    where.push("placa LIKE :placa");
    params.placa = `%${cleanText(filtros.placa, 20).toUpperCase()}%`;
  }

  if (filtros.usuario) {
    where.push("nombre_usuario LIKE :usuario");
    params.usuario = `%${cleanText(filtros.usuario, 120)}%`;
  }

  const rows = await query(
    `SELECT id, codigo, tipo_vehiculo tipo, DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') fecha,
            DATE_FORMAT(fecha_registro, '%H:%i') hora,
            nombre_usuario usuario, documento_usuario documento, placa, modelo,
            sitio_destino destino, kilometraje, checklist
       FROM preoperacionales
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY fecha_registro DESC
      LIMIT 500`,
    params
  );

  return rows.map((row) => ({
    ...row,
    estado: analyzeInspection(row.tipo, row.checklist).estado,
    checklist: undefined
  }));
}
