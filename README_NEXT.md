# Sistema Preoperacional con Next.js, Node y MySQL

Esta carpeta conserva los HTML anteriores y agrega una versión moderna con Next.js lista para Netlify.

## Base de datos

1. Crear la base y tablas:

```sql
SOURCE database/schema.sql;
```

El archivo `schema.sql` evita `CHECK` y tipo `JSON` para mayor compatibilidad con phpMyAdmin, MariaDB y hostings compartidos. La aplicación guarda el checklist como texto JSON válido.

2. Opcionalmente cargar datos de prueba:

```sql
SOURCE database/seed.example.sql;
```

3. Si tienes permisos de administrador en MySQL, puedes crear el usuario de aplicación con:

```sql
SOURCE database/grants.example.sql;
```

En hosting compartido normalmente el usuario se crea desde el panel del proveedor, no desde phpMyAdmin.

## Actualizar una base ya creada

Si ya habías ejecutado el esquema antes de agregar la hoja de vida vehicular, ejecuta una sola vez:

```sql
SOURCE database/migrations/2026-05-20_vehiculos_hoja_vida.sql;
```

Esa migración agrega el tipo `GRUA` y campos administrativos como línea, color, motor, chasis, propietario, responsable, SOAT, tecnomecánica, matrícula y observaciones.

## Variables de entorno

Copiar `.env.example` a `.env.local` para desarrollo local y configurar las mismas variables en Netlify:

```bash
MYSQL_HOST=...
MYSQL_PORT=3306
MYSQL_DATABASE=preoperacional
MYSQL_USER=preoperacional_app
MYSQL_PASSWORD=...
MYSQL_SSL=true
```

## Desarrollo

```bash
npm install
npm run dev
```

## Despliegue Netlify

Netlify usará `netlify.toml`, `npm run build` y `@netlify/plugin-nextjs`.

Recomendación de seguridad: usar una base MySQL administrada accesible por TLS, credenciales de mínimo privilegio y variables de entorno de Netlify. No expongas usuario ni contraseña de MySQL en código del cliente.
