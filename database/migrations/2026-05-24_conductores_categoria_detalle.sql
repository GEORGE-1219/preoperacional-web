USE preoperacional;

ALTER TABLE usuarios_autorizados
  ADD COLUMN categorias_licencia_detalle LONGTEXT NULL AFTER categorias_licencia;
