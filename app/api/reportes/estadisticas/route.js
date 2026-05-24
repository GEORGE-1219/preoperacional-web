import { json, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query(
    `SELECT
       COUNT(*) totalRegistros,
       SUM(tipo_vehiculo = 'MOTO') totalRegistrosMotos,
       SUM(tipo_vehiculo = 'CARRO') totalRegistrosCarros,
       SUM(tipo_vehiculo = 'GRUA') totalRegistrosGruas,
       SUM(DATE(fecha_registro) = CURRENT_DATE()) registrosHoy
     FROM preoperacionales`
  );

  return json(rows[0] || {
    totalRegistros: 0,
    totalRegistrosMotos: 0,
    totalRegistrosCarros: 0,
    totalRegistrosGruas: 0,
    registrosHoy: 0
  });
}
