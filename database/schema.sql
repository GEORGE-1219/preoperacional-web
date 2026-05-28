CREATE DATABASE IF NOT EXISTS preoperacional
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE preoperacional;

CREATE TABLE IF NOT EXISTS vehiculos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo ENUM('MOTO', 'CARRO', 'GRUA') NOT NULL,
  placa VARCHAR(20) NOT NULL,
  modelo VARCHAR(80) NULL,
  marca VARCHAR(80) NULL,
  linea VARCHAR(80) NULL,
  color VARCHAR(60) NULL,
  clase_servicio VARCHAR(80) NULL,
  numero_motor VARCHAR(80) NULL,
  numero_chasis VARCHAR(80) NULL,
  propietario VARCHAR(160) NULL,
  responsable VARCHAR(160) NULL,
  aseguradora_soat VARCHAR(120) NULL,
  numero_soat VARCHAR(80) NULL,
  fecha_inicio_soat DATE NULL,
  fecha_vencimiento_soat DATE NULL,
  fecha_inicio_tecnomecanica DATE NULL,
  fecha_vencimiento_tecnomecanica DATE NULL,
  fecha_matricula DATE NULL,
  observaciones TEXT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_vehiculos_tipo_placa (tipo, placa),
  KEY idx_vehiculos_tipo_activo (tipo, activo)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS preoperacionales (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(24) NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo_vehiculo ENUM('MOTO', 'CARRO', 'GRUA') NOT NULL,
  nombre_usuario VARCHAR(160) NOT NULL,
  documento_usuario VARCHAR(20) NOT NULL,
  placa VARCHAR(20) NOT NULL,
  modelo VARCHAR(80) NULL,
  sitio_destino VARCHAR(160) NOT NULL,
  kilometraje INT UNSIGNED NOT NULL,
  checklist LONGTEXT NOT NULL,
  observaciones TEXT NULL,
  liberado_en TIMESTAMP NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_preoperacionales_codigo (codigo),
  KEY idx_preoperacionales_fecha (fecha_registro),
  KEY idx_preoperacionales_tipo_fecha (tipo_vehiculo, fecha_registro),
  KEY idx_preoperacionales_placa_activo (tipo_vehiculo, placa, fecha_registro, liberado_en)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(160) NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_mime VARCHAR(40) NULL,
  avatar_base64 MEDIUMTEXT NULL,
  rol ENUM('ADMIN', 'OPERADOR') NOT NULL DEFAULT 'ADMIN',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_acceso TIMESTAMP NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_usuarios_email (email),
  KEY idx_admin_usuarios_activo (activo)
) ENGINE=InnoDB;

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
  UNIQUE KEY uk_novedades_codigo (codigo),
  KEY idx_novedades_fecha (fecha_registro),
  KEY idx_novedades_vehiculo_fecha (tipo_vehiculo, placa, fecha_registro),
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
  UNIQUE KEY uk_mantenimientos_codigo (codigo),
  KEY idx_mantenimientos_fecha (fecha_registro),
  KEY idx_mantenimientos_vehiculo_fecha (tipo_vehiculo, placa, fecha_registro),
  KEY idx_mantenimientos_tipo_fecha (tipo_mantenimiento, fecha_registro),
  KEY idx_mantenimientos_documento (documento_responsable)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;
