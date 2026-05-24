USE preoperacional;

CREATE TABLE IF NOT EXISTS novedades_reportes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nombre_conductor VARCHAR(160) NOT NULL,
  documento_conductor VARCHAR(20) NOT NULL,
  tipo_novedad ENUM('DANO_GENERAL', 'DANO_MOTOR', 'ACCIDENTE_TRANSITO', 'PINCHAZO', 'OTRO') NOT NULL,
  otro_tipo VARCHAR(120) NULL,
  lugar VARCHAR(180) NOT NULL,
  latitud DECIMAL(10,7) NULL,
  longitud DECIMAL(10,7) NULL,
  observaciones TEXT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_novedades_fecha (fecha_registro),
  KEY idx_novedades_tipo_fecha (tipo_novedad, fecha_registro),
  KEY idx_novedades_documento (documento_conductor)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;
