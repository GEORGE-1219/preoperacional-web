CREATE USER IF NOT EXISTS 'preoperacional_app'@'%' IDENTIFIED BY 'cambia_esta_clave';
GRANT SELECT, INSERT, UPDATE ON preoperacional.* TO 'preoperacional_app'@'%';
FLUSH PRIVILEGES;
