USE preoperacional;

ALTER TABLE vehiculos
  MODIFY tipo ENUM('MOTO', 'CARRO', 'GRUA') NOT NULL;

ALTER TABLE preoperacionales
  MODIFY tipo_vehiculo ENUM('MOTO', 'CARRO', 'GRUA') NOT NULL;

ALTER TABLE vehiculos
  ADD COLUMN linea VARCHAR(80) NULL AFTER marca,
  ADD COLUMN color VARCHAR(60) NULL AFTER linea,
  ADD COLUMN clase_servicio VARCHAR(80) NULL AFTER color,
  ADD COLUMN numero_motor VARCHAR(80) NULL AFTER clase_servicio,
  ADD COLUMN numero_chasis VARCHAR(80) NULL AFTER numero_motor,
  ADD COLUMN propietario VARCHAR(160) NULL AFTER numero_chasis,
  ADD COLUMN responsable VARCHAR(160) NULL AFTER propietario,
  ADD COLUMN aseguradora_soat VARCHAR(120) NULL AFTER responsable,
  ADD COLUMN numero_soat VARCHAR(80) NULL AFTER aseguradora_soat,
  ADD COLUMN fecha_matricula DATE NULL AFTER fecha_vencimiento_tecnomecanica,
  ADD COLUMN observaciones TEXT NULL AFTER fecha_matricula;
