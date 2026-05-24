import { getRegistros } from "@/lib/preoperacionales";

export const dynamic = "force-dynamic";

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rows = await getRegistros(Object.fromEntries(searchParams.entries()));
  const header = ["Consecutivo", "Tipo", "Fecha", "Usuario", "Documento", "Placa", "Modelo", "Destino", "Kilometraje"];
  const csv = [
    header,
    ...rows.map((row) => [row.codigo, row.tipo, row.fecha, row.usuario, row.documento, row.placa, row.modelo, row.destino, row.kilometraje])
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="preoperacionales_${Date.now()}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
