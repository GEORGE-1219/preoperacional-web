USE preoperacional;

CREATE TABLE IF NOT EXISTS admin_usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(160) NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('ADMIN', 'OPERADOR') NOT NULL DEFAULT 'ADMIN',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_acceso TIMESTAMP NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_usuarios_email (email),
  KEY idx_admin_usuarios_activo (activo)
) ENGINE=InnoDB;

SET @add_avatar_mime = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE admin_usuarios ADD COLUMN avatar_mime VARCHAR(40) NULL AFTER password_hash',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_usuarios'
    AND COLUMN_NAME = 'avatar_mime'
);
PREPARE stmt FROM @add_avatar_mime;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_avatar_base64 = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE admin_usuarios ADD COLUMN avatar_base64 MEDIUMTEXT NULL AFTER avatar_mime',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_usuarios'
    AND COLUMN_NAME = 'avatar_base64'
);
PREPARE stmt FROM @add_avatar_base64;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
