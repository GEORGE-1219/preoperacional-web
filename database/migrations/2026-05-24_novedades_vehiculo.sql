USE preoperacional;

ALTER TABLE novedades_reportes
  ADD COLUMN tipo_vehiculo ENUM('MOTO', 'CARRO', 'GRUA') NULL AFTER documento_conductor,
  ADD COLUMN placa VARCHAR(20) NULL AFTER tipo_vehiculo;

ALTER TABLE novedades_reportes
  ADD KEY idx_novedades_vehiculo_fecha (tipo_vehiculo, placa, fecha_registro);
