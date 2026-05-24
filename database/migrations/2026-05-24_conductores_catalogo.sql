USE preoperacional;

ALTER TABLE usuarios_autorizados
  ADD COLUMN actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER creado_en;

ALTER TABLE usuarios_autorizados
  ADD KEY idx_usuarios_nombre (nombre),
  ADD KEY idx_usuarios_activo (activo);
