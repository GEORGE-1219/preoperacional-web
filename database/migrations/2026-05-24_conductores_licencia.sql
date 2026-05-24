USE preoperacional;

ALTER TABLE usuarios_autorizados
  ADD COLUMN numero_licencia VARCHAR(60) NULL AFTER nombre,
  ADD COLUMN categorias_licencia VARCHAR(120) NULL AFTER numero_licencia,
  ADD COLUMN fecha_expedicion_licencia DATE NULL AFTER categorias_licencia,
  ADD COLUMN fecha_vencimiento_licencia DATE NULL AFTER fecha_expedicion_licencia,
  ADD COLUMN licencia_frente_mime VARCHAR(40) NULL AFTER fecha_vencimiento_licencia,
  ADD COLUMN licencia_frente_base64 MEDIUMTEXT NULL AFTER licencia_frente_mime,
  ADD COLUMN licencia_reverso_mime VARCHAR(40) NULL AFTER licencia_frente_base64,
  ADD COLUMN licencia_reverso_base64 MEDIUMTEXT NULL AFTER licencia_reverso_mime;
