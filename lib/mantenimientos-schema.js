import { query } from "./db";

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

export async function ensureMantenimientosSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS mantenimientos_reportes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      codigo VARCHAR(24) NULL,
      fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      tipo_vehiculo ENUM('MOTO', 'CARRO', 'GRUA') NOT NULL,
      placa VARCHAR(20) NOT NULL,
      nombre_responsable VARCHAR(160) NOT NULL,
      documento_responsable VARCHAR(20) NOT NULL,
      tipo_mantenimiento ENUM('PREVENTIVO', 'CORRECTIVO', 'CAMBIO_ACEITE', 'OTRO') NOT NULL,
      otro_tipo VARCHAR(120) NULL,
      kilometraje INT UNSIGNED NULL,
      lugar VARCHAR(180) NOT NULL,
      proveedor VARCHAR(160) NULL,
      costo DECIMAL(12,2) NULL,
      observaciones TEXT NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_mantenimientos_fecha (fecha_registro),
      KEY idx_mantenimientos_vehiculo_fecha (tipo_vehiculo, placa, fecha_registro),
      KEY idx_mantenimientos_tipo_fecha (tipo_mantenimiento, fecha_registro),
      KEY idx_mantenimientos_documento (documento_responsable)
    ) ENGINE=InnoDB
  `);

  if (!(await columnExists("mantenimientos_reportes", "codigo"))) {
    await query("ALTER TABLE mantenimientos_reportes ADD COLUMN codigo VARCHAR(24) NULL AFTER id");
  }

  await query(`
    UPDATE mantenimientos_reportes
       SET codigo = CONCAT('MAN-', IF(id < 10000, LPAD(id, 4, '0'), id))
     WHERE codigo IS NULL OR codigo = ''
  `);

  if (!(await indexExists("mantenimientos_reportes", "uk_mantenimientos_codigo"))) {
    await query("ALTER TABLE mantenimientos_reportes ADD UNIQUE KEY uk_mantenimientos_codigo (codigo)");
  }

  if (!(await indexExists("mantenimientos_reportes", "idx_mantenimientos_vehiculo_fecha"))) {
    await query("ALTER TABLE mantenimientos_reportes ADD KEY idx_mantenimientos_vehiculo_fecha (tipo_vehiculo, placa, fecha_registro)");
  }

  await query(`
    CREATE TABLE IF NOT EXISTS mantenimientos_fotos (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      mantenimiento_id BIGINT UNSIGNED NOT NULL,
      etiqueta VARCHAR(120) NOT NULL,
      mime_type VARCHAR(40) NOT NULL,
      imagen_base64 LONGTEXT NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_mantenimientos_fotos_reporte (mantenimiento_id),
      CONSTRAINT fk_mantenimientos_fotos_reporte
        FOREIGN KEY (mantenimiento_id)
        REFERENCES mantenimientos_reportes(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}
