import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getBrandLogoDataUri } from "@/lib/brand-assets";
import { cleanText, json, normalizeTipo, query } from "@/lib/db";
import { ensureVehicleSchema } from "@/lib/vehicle-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDate(value) {
  return value || "No registrada";
}

function drawField(doc, label, value, x, y, width) {
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#657486")
    .text(label.toUpperCase(), x, y, { width });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#12324a")
    .text(value || "No registrado", x, y + 13, { width });
}

function drawSectionTitle(doc, title, y) {
  doc
    .roundedRect(40, y, 515, 24, 4)
    .fill("#0066b3")
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(title, 52, y + 7);
}

function drawLogo(doc, x, y, width, height) {
  const logo = getBrandLogoDataUri();
  if (!logo) return;

  doc.roundedRect(x, y, width, height, 6).fill("#ffffff");
  doc.image(logo, x + 9, y + 8, { fit: [width - 18, height - 16], align: "center", valign: "center" });
}

function createVehiclePdf(vehicle) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Hoja de vida ${vehicle.placa}` } });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, 595.28, 118).fill("#f1f6fb");
    doc.rect(0, 0, 595.28, 18).fill("#0066b3");
    drawLogo(doc, 40, 34, 126, 44);
    doc
      .fillColor("#12324a")
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("Hoja de vida vehicular", 190, 40, { width: 210 });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#657486")
      .text("Sistema Preoperacional - A&A Comunicaciones", 190, 69, { width: 210 });
    doc
      .roundedRect(420, 38, 135, 50, 6)
      .fill(vehicle.activo ? "#2d7a3e" : "#b42318")
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(vehicle.placa, 430, 48, { width: 115, align: "center" })
      .fontSize(9)
      .text(vehicle.activo ? "ACTIVO" : "INACTIVO", 430, 71, { width: 115, align: "center" });

    drawSectionTitle(doc, "Identificación del vehículo", 136);
    drawField(doc, "Tipo", vehicle.tipo, 52, 176, 110);
    drawField(doc, "Marca", vehicle.marca, 180, 176, 110);
    drawField(doc, "Línea / referencia", vehicle.linea, 308, 176, 120);
    drawField(doc, "Modelo", vehicle.modelo, 446, 176, 90);
    drawField(doc, "Color", vehicle.color, 52, 226, 110);
    drawField(doc, "Clase de servicio", vehicle.claseServicio, 180, 226, 150);
    drawField(doc, "Número de motor", vehicle.numeroMotor, 348, 226, 188);
    drawField(doc, "Número de chasis", vehicle.numeroChasis, 52, 276, 210);
    drawField(doc, "Propietario", vehicle.propietario, 280, 276, 256);

    drawSectionTitle(doc, "Responsables y documentación", 336);
    drawField(doc, "Responsable / conductor", vehicle.responsable, 52, 376, 210);
    drawField(doc, "Aseguradora SOAT", vehicle.aseguradoraSOAT, 280, 376, 130);
    drawField(doc, "Número SOAT", vehicle.numeroSOAT, 428, 376, 108);
    drawField(doc, "Inicio SOAT", formatDate(vehicle.fechaInicioSOAT), 52, 426, 110);
    drawField(doc, "Vencimiento SOAT", formatDate(vehicle.fechaVencimientoSOAT), 180, 426, 130);
    drawField(doc, "Inicio tecnomecánica", formatDate(vehicle.fechaInicioTecnomecanica), 328, 426, 120);
    drawField(doc, "Vence tecnomecánica", formatDate(vehicle.fechaVencimientoTecnomecanica), 466, 426, 90);
    drawField(doc, "Fecha matrícula", formatDate(vehicle.fechaMatricula), 52, 476, 150);

    drawSectionTitle(doc, "Observaciones", 536);
    doc
      .roundedRect(52, 576, 492, 92, 6)
      .strokeColor("#dbe4ee")
      .stroke()
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#12324a")
      .text(vehicle.observaciones || "Sin observaciones registradas.", 64, 590, { width: 468, height: 66 });

    doc
      .moveTo(40, 755)
      .lineTo(555, 755)
      .strokeColor("#dbe4ee")
      .stroke()
      .fontSize(8)
      .fillColor("#657486")
      .text(`Generado el ${new Date().toLocaleString("es-CO")}`, 40, 765)
      .text("Documento generado automáticamente por el sistema.", 320, 765, { width: 235, align: "right" });

    doc.end();
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tipo = normalizeTipo(searchParams.get("tipo"));
  const placa = cleanText(searchParams.get("placa"), 20).toUpperCase();

  if (!tipo || !placa) {
    return json({ success: false, mensaje: "Tipo y placa son obligatorios." }, 400);
  }

  try {
    await ensureVehicleSchema();
  } catch (error) {
    return json({ success: false, mensaje: error.message }, 409);
  }

  const rows = await query(
    `SELECT tipo, placa, modelo, marca, linea, color,
            clase_servicio claseServicio, numero_motor numeroMotor,
            numero_chasis numeroChasis, propietario, responsable,
            aseguradora_soat aseguradoraSOAT, numero_soat numeroSOAT,
            observaciones, activo,
            DATE_FORMAT(fecha_inicio_soat, '%Y-%m-%d') fechaInicioSOAT,
            DATE_FORMAT(fecha_vencimiento_soat, '%Y-%m-%d') fechaVencimientoSOAT,
            DATE_FORMAT(fecha_inicio_tecnomecanica, '%Y-%m-%d') fechaInicioTecnomecanica,
            DATE_FORMAT(fecha_vencimiento_tecnomecanica, '%Y-%m-%d') fechaVencimientoTecnomecanica,
            DATE_FORMAT(fecha_matricula, '%Y-%m-%d') fechaMatricula
       FROM vehiculos
      WHERE tipo = :tipo
        AND placa = :placa
      LIMIT 1`,
    { tipo, placa }
  );

  if (!rows.length) {
    return json({ success: false, mensaje: "Vehículo no encontrado." }, 404);
  }

  const pdf = await createVehiclePdf(rows[0]);

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hoja_vida_${tipo}_${placa}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
