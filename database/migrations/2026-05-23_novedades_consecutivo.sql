USE preoperacional;

ALTER TABLE novedades_reportes
  ADD COLUMN codigo VARCHAR(24) NULL AFTER id;

UPDATE novedades_reportes
   SET codigo = CONCAT('NOV-', IF(id < 10000, LPAD(id, 4, '0'), id))
 WHERE codigo IS NULL OR codigo = '';

ALTER TABLE novedades_reportes
  ADD UNIQUE KEY uk_novedades_codigo (codigo);
