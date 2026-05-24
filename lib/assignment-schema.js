import { query } from "./db";

let checked = false;

export async function ensureAssignmentSchema() {
  if (checked) return;

  await query(`
    CREATE TABLE IF NOT EXISTS vehiculo_asignaciones (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      tipo_vehiculo ENUM('MOTO', 'CARRO', 'GRUA') NOT NULL,
      placa VARCHAR(20) NOT NULL,
      conductor_nombre VARCHAR(160) NOT NULL,
      conductor_documento VARCHAR(20) NULL,
      observaciones TEXT NULL,
      fecha_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fecha_fin TIMESTAMP NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_asignaciones_vehiculo (tipo_vehiculo, placa, fecha_inicio),
      KEY idx_asignaciones_activa (tipo_vehiculo, placa, fecha_fin)
    ) ENGINE=InnoDB
  `);

  checked = true;
}
