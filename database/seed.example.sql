USE preoperacional;

INSERT INTO vehiculos
  (tipo, placa, modelo, marca, linea, color, responsable, fecha_inicio_soat, fecha_vencimiento_soat, fecha_inicio_tecnomecanica, fecha_vencimiento_tecnomecanica)
VALUES
  ('MOTO', 'ABC12D', '2023', 'Yamaha', 'XTZ', 'AZUL', 'OPERACIONES', '2026-01-01', '2027-01-01', '2026-01-01', '2027-01-01'),
  ('CARRO', 'XYZ123', '2022', 'Toyota', 'Hilux', 'BLANCO', 'OPERACIONES', '2026-01-01', '2027-01-01', '2026-01-01', '2027-01-01'),
  ('GRUA', 'GRU001', '2021', 'Chevrolet', 'NPR Grúa', 'BLANCO', 'OPERACIONES', '2026-01-01', '2027-01-01', '2026-01-01', '2027-01-01')
ON DUPLICATE KEY UPDATE placa = VALUES(placa);

INSERT INTO usuarios_autorizados (documento, nombre)
VALUES ('123456789', 'USUARIO DE PRUEBA')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), activo = 1;
