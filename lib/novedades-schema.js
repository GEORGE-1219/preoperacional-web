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

export async function ensureNovedadesSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS novedades_reportes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      codigo VARCHAR(24) NULL,
      fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      nombre_conductor VARCHAR(160) NOT NULL,
      documento_conductor VARCHAR(20) NOT NULL,
      tipo_vehiculo ENUM('MOTO', 'CARRO', 'GRUA') NULL,
      placa VARCHAR(20) NULL,
      tipo_novedad ENUM('DANO_GENERAL', 'DANO_MOTOR', 'ACCIDENTE_TRANSITO', 'PINCHAZO', 'OTRO') NOT NULL,
      otro_tipo VARCHAR(120) NULL,
      lugar VARCHAR(180) NOT NULL,
      latitud DECIMAL(10,7) NULL,
      longitud DECIMAL(10,7) NULL,
      observaciones TEXT NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_novedades_fecha (fecha_registro),
      KEY idx_novedades_vehiculo_fecha (tipo_vehiculo, placa, fecha_registro),
      KEY idx_novedades_tipo_fecha (tipo_novedad, fecha_registro),
      KEY idx_novedades_documento (documento_conductor)
    ) ENGINE=InnoDB
  `);

  if (!(await columnExists("novedades_reportes", "codigo"))) {
    await query("ALTER TABLE novedades_reportes ADD COLUMN codigo VARCHAR(24) NULL AFTER id");
  }

  if (!(await columnExists("novedades_reportes", "tipo_vehiculo"))) {
    await query("ALTER TABLE novedades_reportes ADD COLUMN tipo_vehiculo ENUM('MOTO', 'CARRO', 'GRUA') NULL AFTER documento_conductor");
  }

  if (!(await columnExists("novedades_reportes", "placa"))) {
    await query("ALTER TABLE novedades_reportes ADD COLUMN placa VARCHAR(20) NULL AFTER tipo_vehiculo");
  }

  await query(`
    UPDATE novedades_reportes
       SET codigo = CONCAT('NOV-', IF(id < 10000, LPAD(id, 4, '0'), id))
     WHERE codigo IS NULL OR codigo = ''
  `);

  if (!(await indexExists("novedades_reportes", "uk_novedades_codigo"))) {
    await query("ALTER TABLE novedades_reportes ADD UNIQUE KEY uk_novedades_codigo (codigo)");
  }

  if (!(await indexExists("novedades_reportes", "idx_novedades_vehiculo_fecha"))) {
    await query("ALTER TABLE novedades_reportes ADD KEY idx_novedades_vehiculo_fecha (tipo_vehiculo, placa, fecha_registro)");
  }

  await query(`
    CREATE TABLE IF NOT EXISTS novedades_fotos (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      novedad_id BIGINT UNSIGNED NOT NULL,
      etiqueta VARCHAR(120) NOT NULL,
      mime_type VARCHAR(40) NOT NULL,
      imagen_base64 LONGTEXT NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_novedades_fotos_reporte (novedad_id),
      CONSTRAINT fk_novedades_fotos_reporte
        FOREIGN KEY (novedad_id)
        REFERENCES novedades_reportes(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}
