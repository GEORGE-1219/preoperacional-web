USE preoperacional;

ALTER TABLE usuarios_autorizados
  ADD COLUMN restricciones TEXT NULL AFTER fecha_expedicion_licencia;
