import mysql from "mysql2/promise";

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE || "preoperacional",
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      waitForConnections: true,
      connectionLimit: 5,
      namedPlaceholders: true,
      ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined
    });
  }

  return pool;
}

export async function query(sql, params = {}) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export function normalizeTipo(value) {
  const tipo = String(value || "").trim().toUpperCase();
  return ["MOTO", "CARRO", "GRUA"].includes(tipo) ? tipo : null;
}

export function cleanText(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

export function requireAdmin(request) {
  const configured = process.env.ADMIN_API_TOKEN;
  if (!configured) return false;

  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${configured}`;
}
