USE preoperacional;

ALTER TABLE preoperacionales
  ADD COLUMN codigo VARCHAR(24) NULL AFTER id;

UPDATE preoperacionales
   SET codigo = CONCAT('PRE-', IF(id < 100, LPAD(id, 2, '0'), id))
 WHERE codigo IS NULL OR codigo = '';

ALTER TABLE preoperacionales
  ADD UNIQUE KEY uk_preoperacionales_codigo (codigo);
