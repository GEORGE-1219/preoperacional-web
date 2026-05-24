import { cleanText, query } from "./db";

const LICENSE_CATEGORIES = new Set(["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3"]);
const MAX_LICENSE_IMAGE_BASE64_LENGTH = 1_600_000;

async function columnExists(columnName) {
  const rows = await query(
    `SELECT COUNT(*) total
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios_autorizados'
        AND COLUMN_NAME = :columnName`,
    { columnName }
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function indexExists(indexName) {
  const rows = await query(
    `SELECT COUNT(*) total
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios_autorizados'
        AND INDEX_NAME = :indexName`,
    { indexName }
  );
  return Number(rows[0]?.total || 0) > 0;
}

export async function ensureConductoresSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS usuarios_autorizados (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      documento VARCHAR(20) NOT NULL,
      nombre VARCHAR(160) NOT NULL,
      numero_licencia VARCHAR(60) NULL,
      categorias_licencia VARCHAR(120) NULL,
      categorias_licencia_detalle LONGTEXT NULL,
      fecha_expedicion_licencia DATE NULL,
      restricciones TEXT NULL,
      fecha_vencimiento_licencia DATE NULL,
      licencia_frente_mime VARCHAR(40) NULL,
      licencia_frente_base64 MEDIUMTEXT NULL,
      licencia_reverso_mime VARCHAR(40) NULL,
      licencia_reverso_base64 MEDIUMTEXT NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_usuarios_documento (documento),
      KEY idx_usuarios_nombre (nombre),
      KEY idx_usuarios_activo (activo)
    ) ENGINE=InnoDB
  `);

  if (!(await columnExists("actualizado_en"))) {
    await query("ALTER TABLE usuarios_autorizados ADD COLUMN actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER creado_en");
  }

  const columns = [
    ["numero_licencia", "ALTER TABLE usuarios_autorizados ADD COLUMN numero_licencia VARCHAR(60) NULL AFTER nombre"],
    ["categorias_licencia", "ALTER TABLE usuarios_autorizados ADD COLUMN categorias_licencia VARCHAR(120) NULL AFTER numero_licencia"],
    ["categorias_licencia_detalle", "ALTER TABLE usuarios_autorizados ADD COLUMN categorias_licencia_detalle LONGTEXT NULL AFTER categorias_licencia"],
    ["fecha_expedicion_licencia", "ALTER TABLE usuarios_autorizados ADD COLUMN fecha_expedicion_licencia DATE NULL AFTER categorias_licencia_detalle"],
    ["restricciones", "ALTER TABLE usuarios_autorizados ADD COLUMN restricciones TEXT NULL AFTER fecha_expedicion_licencia"],
    ["fecha_vencimiento_licencia", "ALTER TABLE usuarios_autorizados ADD COLUMN fecha_vencimiento_licencia DATE NULL AFTER fecha_expedicion_licencia"],
    ["licencia_frente_mime", "ALTER TABLE usuarios_autorizados ADD COLUMN licencia_frente_mime VARCHAR(40) NULL AFTER fecha_vencimiento_licencia"],
    ["licencia_frente_base64", "ALTER TABLE usuarios_autorizados ADD COLUMN licencia_frente_base64 MEDIUMTEXT NULL AFTER licencia_frente_mime"],
    ["licencia_reverso_mime", "ALTER TABLE usuarios_autorizados ADD COLUMN licencia_reverso_mime VARCHAR(40) NULL AFTER licencia_frente_base64"],
    ["licencia_reverso_base64", "ALTER TABLE usuarios_autorizados ADD COLUMN licencia_reverso_base64 MEDIUMTEXT NULL AFTER licencia_reverso_mime"]
  ];

  for (const [column, sql] of columns) {
    if (!(await columnExists(column))) {
      await query(sql);
    }
  }

  if (!(await indexExists("idx_usuarios_nombre"))) {
    await query("ALTER TABLE usuarios_autorizados ADD KEY idx_usuarios_nombre (nombre)");
  }

  if (!(await indexExists("idx_usuarios_activo"))) {
    await query("ALTER TABLE usuarios_autorizados ADD KEY idx_usuarios_activo (activo)");
  }
}

export function normalizeConductor(input = {}) {
  const documento = cleanText(input.documento, 20);
  const nombre = cleanText(input.nombre, 160).toUpperCase();
  const categorias = Array.isArray(input.categoriasLicencia)
    ? input.categoriasLicencia.map((item) => String(item || "").toUpperCase()).filter((item) => LICENSE_CATEGORIES.has(item))
    : [];
  const categoriasUnicas = [...new Set(categorias)];
  const details = normalizeCategoryDetails(categoriasUnicas, input.categoriasLicenciaDetalle);

  return {
    documento,
    nombre,
    numeroLicencia: cleanText(input.numeroLicencia, 60).toUpperCase(),
    categoriasLicencia: categoriasUnicas,
    categoriasLicenciaDetalle: details,
    fechaExpedicionLicencia: input.fechaExpedicionLicencia || null,
    fechaVencimientoLicencia: input.fechaVencimientoLicencia || null,
    restricciones: cleanText(input.restricciones, 600),
    licenciaFrente: parseLicenseImage(input.licenciaFrenteDataUrl),
    licenciaReverso: parseLicenseImage(input.licenciaReversoDataUrl)
  };
}

function normalizeCategoryDetails(categories, input = {}) {
  const serviceTypes = new Set(["PARTICULAR", "PUBLICO"]);
  const detailsByCategory = Array.isArray(input)
    ? Object.fromEntries(input.map((item) => [String(item?.categoria || "").toUpperCase(), item]))
    : input || {};

  return categories.map((category) => {
    const detail = detailsByCategory[category] || {};
    const tipoServicio = String(detail.tipoServicio || "").toUpperCase();

    return {
      categoria: category,
      fechaVigencia: detail.fechaVigencia || "",
      tipoServicio: serviceTypes.has(tipoServicio) ? tipoServicio : ""
    };
  });
}

function parseCategoryDetails(value, categories = []) {
  try {
    const parsed = JSON.parse(value || "[]");
    const items = Array.isArray(parsed) ? parsed : [];
    const byCategory = Object.fromEntries(items.map((item) => [item.categoria, item]));
    return Object.fromEntries(
      categories.map((category) => [
        category,
        {
          fechaVigencia: byCategory[category]?.fechaVigencia || "",
          tipoServicio: byCategory[category]?.tipoServicio || ""
        }
      ])
    );
  } catch {
    return Object.fromEntries(categories.map((category) => [category, { fechaVigencia: "", tipoServicio: "" }]));
  }
}

function parseLicenseImage(dataUrl) {
  const value = String(dataUrl || "");
  if (!value) return null;

  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("La foto de la licencia debe ser una imagen valida.");

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const base64 = match[2];
  if (base64.length > MAX_LICENSE_IMAGE_BASE64_LENGTH) {
    throw new Error("La foto de la licencia supera el tamano permitido.");
  }

  return { mimeType, base64 };
}

function conductorPayload(row) {
  const categories = row.categoriasLicencia ? String(row.categoriasLicencia).split(",").filter(Boolean) : [];
  return {
    ...row,
    categoriasLicencia: categories,
    categoriasLicenciaDetalle: parseCategoryDetails(row.categoriasLicenciaDetalle, categories),
    licenciaFrenteDataUrl: row.licenciaFrenteBase64 ? `data:${row.licenciaFrenteMime || "image/jpeg"};base64,${row.licenciaFrenteBase64}` : "",
    licenciaReversoDataUrl: row.licenciaReversoBase64 ? `data:${row.licenciaReversoMime || "image/jpeg"};base64,${row.licenciaReversoBase64}` : "",
    licenciaFrenteBase64: undefined,
    licenciaReversoBase64: undefined,
    licenciaFrenteMime: undefined,
    licenciaReversoMime: undefined
  };
}

export function validateConductor(input = {}) {
  const conductor = normalizeConductor(input);
  const errors = [];

  if (!conductor.nombre) errors.push("Ingrese el nombre del conductor.");
  if (!/^[0-9]{6,12}$/.test(conductor.documento)) errors.push("El documento debe tener entre 6 y 12 digitos.");
  for (const detail of conductor.categoriasLicenciaDetalle) {
    if (!detail.fechaVigencia) errors.push(`Ingrese la fecha de vigencia para la categoria ${detail.categoria}.`);
    if (!detail.tipoServicio) errors.push(`Seleccione el tipo de servicio para la categoria ${detail.categoria}.`);
    if (conductor.fechaExpedicionLicencia && detail.fechaVigencia && detail.fechaVigencia < conductor.fechaExpedicionLicencia) {
      errors.push(`La vigencia de la categoria ${detail.categoria} no puede ser anterior a la expedicion.`);
    }
  }
  if (conductor.fechaExpedicionLicencia && conductor.fechaVencimientoLicencia && conductor.fechaVencimientoLicencia < conductor.fechaExpedicionLicencia) {
    errors.push("La fecha de vencimiento no puede ser anterior a la expedicion.");
  }

  return { ok: !errors.length, errors, conductor };
}

export async function listConductores({ includeInactive = true } = {}) {
  await ensureConductoresSchema();
  const rows = await query(
    `SELECT id, documento, nombre,
            numero_licencia numeroLicencia,
            categorias_licencia categoriasLicencia,
            categorias_licencia_detalle categoriasLicenciaDetalle,
            DATE_FORMAT(fecha_expedicion_licencia, '%Y-%m-%d') fechaExpedicionLicencia,
            DATE_FORMAT(fecha_vencimiento_licencia, '%Y-%m-%d') fechaVencimientoLicencia,
            restricciones,
            licencia_frente_mime licenciaFrenteMime,
            licencia_frente_base64 licenciaFrenteBase64,
            licencia_reverso_mime licenciaReversoMime,
            licencia_reverso_base64 licenciaReversoBase64,
            activo,
            DATE_FORMAT(creado_en, '%Y-%m-%d %H:%i:%s') creadoEn
       FROM usuarios_autorizados
      WHERE (:includeInactive = 1 OR activo = 1)
      ORDER BY nombre ASC
      LIMIT 500`,
    { includeInactive: includeInactive ? 1 : 0 }
  );
  return rows.map(conductorPayload);
}

export async function searchConductores(term) {
  await ensureConductoresSchema();
  const q = cleanText(term, 80).toUpperCase();
  if (q.length < 2) return [];

  return query(
    `SELECT id, documento, nombre
       FROM usuarios_autorizados
      WHERE activo = 1
        AND (nombre LIKE :term OR documento LIKE :term)
      ORDER BY nombre ASC
      LIMIT 10`,
    { term: `%${q}%` }
  );
}

export async function saveConductor(input = {}) {
  await ensureConductoresSchema();
  const parsed = validateConductor(input);
  if (!parsed.ok) {
    throw new Error(parsed.errors[0]);
  }

  await query(
    `INSERT INTO usuarios_autorizados
      (documento, nombre, numero_licencia, categorias_licencia, categorias_licencia_detalle, fecha_expedicion_licencia,
       restricciones, fecha_vencimiento_licencia, licencia_frente_mime, licencia_frente_base64,
       licencia_reverso_mime, licencia_reverso_base64, activo)
     VALUES
      (:documento, :nombre, :numeroLicencia, :categoriasLicencia, :categoriasLicenciaDetalle, :fechaExpedicionLicencia,
       :restricciones, :fechaVencimientoLicencia, :licenciaFrenteMime, :licenciaFrenteBase64,
       :licenciaReversoMime, :licenciaReversoBase64, 1)
     ON DUPLICATE KEY UPDATE
       nombre = VALUES(nombre),
       numero_licencia = VALUES(numero_licencia),
       categorias_licencia = VALUES(categorias_licencia),
       categorias_licencia_detalle = VALUES(categorias_licencia_detalle),
       fecha_expedicion_licencia = VALUES(fecha_expedicion_licencia),
       restricciones = VALUES(restricciones),
       fecha_vencimiento_licencia = VALUES(fecha_vencimiento_licencia),
       licencia_frente_mime = VALUES(licencia_frente_mime),
       licencia_frente_base64 = VALUES(licencia_frente_base64),
       licencia_reverso_mime = VALUES(licencia_reverso_mime),
       licencia_reverso_base64 = VALUES(licencia_reverso_base64),
       activo = 1`,
    {
      ...parsed.conductor,
      categoriasLicencia: parsed.conductor.categoriasLicencia.join(","),
      categoriasLicenciaDetalle: JSON.stringify(parsed.conductor.categoriasLicenciaDetalle),
      fechaVencimientoLicencia: parsed.conductor.categoriasLicenciaDetalle
        .map((item) => item.fechaVigencia)
        .filter(Boolean)
        .sort()[0] || parsed.conductor.fechaVencimientoLicencia,
      licenciaFrenteMime: parsed.conductor.licenciaFrente?.mimeType || null,
      licenciaFrenteBase64: parsed.conductor.licenciaFrente?.base64 || null,
      licenciaReversoMime: parsed.conductor.licenciaReverso?.mimeType || null,
      licenciaReversoBase64: parsed.conductor.licenciaReverso?.base64 || null
    }
  );

  return parsed.conductor;
}

export async function setConductorActivo(id, activo) {
  await ensureConductoresSchema();
  await query(
    "UPDATE usuarios_autorizados SET activo = :activo WHERE id = :id LIMIT 1",
    { id: Number(id), activo: activo ? 1 : 0 }
  );
}
