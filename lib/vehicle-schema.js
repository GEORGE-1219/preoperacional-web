import { query } from "./db";

let checked = false;

const VEHICLE_COLUMNS = [
  ["linea", "ADD COLUMN linea VARCHAR(80) NULL AFTER marca"],
  ["color", "ADD COLUMN color VARCHAR(60) NULL AFTER linea"],
  ["clase_servicio", "ADD COLUMN clase_servicio VARCHAR(80) NULL AFTER color"],
  ["numero_motor", "ADD COLUMN numero_motor VARCHAR(80) NULL AFTER clase_servicio"],
  ["numero_chasis", "ADD COLUMN numero_chasis VARCHAR(80) NULL AFTER numero_motor"],
  ["propietario", "ADD COLUMN propietario VARCHAR(160) NULL AFTER numero_chasis"],
  ["responsable", "ADD COLUMN responsable VARCHAR(160) NULL AFTER propietario"],
  ["aseguradora_soat", "ADD COLUMN aseguradora_soat VARCHAR(120) NULL AFTER responsable"],
  ["numero_soat", "ADD COLUMN numero_soat VARCHAR(80) NULL AFTER aseguradora_soat"],
  ["fecha_matricula", "ADD COLUMN fecha_matricula DATE NULL AFTER fecha_vencimiento_tecnomecanica"],
  ["observaciones", "ADD COLUMN observaciones TEXT NULL AFTER fecha_matricula"]
];

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

async function enumSupportsValue(tableName, columnName, value) {
  const rows = await query(
    `SELECT COLUMN_TYPE columnType
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
        AND COLUMN_NAME = :columnName
      LIMIT 1`,
    { tableName, columnName }
  );

  return String(rows[0]?.columnType || "").includes(`'${value}'`);
}

export async function ensureVehicleSchema() {
  if (checked) return;

  try {
    if (!(await enumSupportsValue("vehiculos", "tipo", "GRUA"))) {
      await query("ALTER TABLE vehiculos MODIFY tipo ENUM('MOTO', 'CARRO', 'GRUA') NOT NULL");
    }

    if (!(await enumSupportsValue("preoperacionales", "tipo_vehiculo", "GRUA"))) {
      await query("ALTER TABLE preoperacionales MODIFY tipo_vehiculo ENUM('MOTO', 'CARRO', 'GRUA') NOT NULL");
    }

    for (const [columnName, alterSql] of VEHICLE_COLUMNS) {
      if (!(await columnExists("vehiculos", columnName))) {
        await query(`ALTER TABLE vehiculos ${alterSql}`);
      }
    }

    checked = true;
  } catch (error) {
    error.message = `No se pudo actualizar la estructura de la tabla vehiculos. Ejecuta la migración SQL o usa un usuario MySQL con permiso ALTER. Detalle: ${error.message}`;
    throw error;
  }
}
