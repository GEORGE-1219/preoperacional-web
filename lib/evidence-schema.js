import { query } from "./db";

let checked = false;

export async function ensureEvidenceSchema() {
  if (checked) return;

  await query(`
    CREATE TABLE IF NOT EXISTS preoperacional_fotos (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      preoperacional_id BIGINT UNSIGNED NOT NULL,
      codigo VARCHAR(80) NOT NULL,
      etiqueta VARCHAR(120) NOT NULL,
      mime_type VARCHAR(40) NOT NULL,
      imagen_base64 LONGTEXT NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_preoperacional_fotos_registro (preoperacional_id),
      CONSTRAINT fk_preoperacional_fotos_registro
        FOREIGN KEY (preoperacional_id)
        REFERENCES preoperacionales(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  checked = true;
}
