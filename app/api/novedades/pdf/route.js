import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getBrandLogoDataUri } from "@/lib/brand-assets";
import { cleanText, json, query } from "@/lib/db";
import { ensureNovedadesSchema } from "@/lib/novedades-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noveltyLabel(value, other) {
  const labels = {
    DANO_GENERAL: "Daño general",
    DANO_MOTOR: "Daño motor",
    ACCIDENTE_TRANSITO: "Accidente de tránsito",
    PINCHAZO: "Pinchazo",
    OTRO: other || "Otro"
  };
  return labels[value] || value || "Sin clasificar";
}

function drawLogo(doc, x, y, width, height) {
  const logo = getBrandLogoDataUri();
  if (!logo) return;

  doc.roundedRect(x, y, width, height, 6).fill("#ffffff");
  doc.image(logo, x + 9, y + 8, { fit: [width - 18, height - 16], align: "center", valign: "center" });
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

function ensureSpace(doc, y, needed = 80) {
  if (y + needed <= 760) return y;
  doc.addPage();
  return 40;
}

function createNovedadPdf(novedad, fotos) {
  return new Promise((resolve, reject) => {
    const codigo = novedad.codigo || `NOV-${String(novedad.id).padStart(4, "0")}`;
    const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Novedad ${codigo}` } });
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
      .fontSize(21)
      .text("Reporte de novedad", 190, 39, { width: 210, lineBreak: false });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#657486")
      .text("Novedades o daños durante el recorrido", 190, 68, { width: 220 });
    doc
      .roundedRect(420, 38, 135, 50, 6)
      .fill("#2d7a3e")
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(17)
      .text(codigo, 430, 49, { width: 115, align: "center" })
      .fontSize(8)
      .text("CONSECUTIVO", 430, 72, { width: 115, align: "center" });

    drawSectionTitle(doc, "Datos del reporte", 136);
    drawField(doc, "Consecutivo", codigo, 52, 176, 125);
    drawField(doc, "Fecha", novedad.creadoEn, 195, 176, 150);
    drawField(doc, "Tipo de novedad", noveltyLabel(novedad.tipoNovedad, novedad.otroTipo), 363, 176, 165);
    drawField(doc, "Conductor", novedad.nombreConductor, 52, 226, 210);
    drawField(doc, "Documento", novedad.documentoConductor, 280, 226, 120);
    drawField(doc, "Vehiculo", [novedad.tipoVehiculo, novedad.placa].filter(Boolean).join(" - "), 418, 226, 118);
    drawField(doc, "Lugar / sitio", novedad.lugar, 52, 276, 300);

    drawSectionTitle(doc, "Ubicación", 336);
    const hasLocation = novedad.latitud && novedad.longitud;
    drawField(doc, "Latitud", hasLocation ? String(novedad.latitud) : "No registrada", 52, 376, 150);
    drawField(doc, "Longitud", hasLocation ? String(novedad.longitud) : "No registrada", 220, 376, 150);
    drawField(doc, "Mapa", hasLocation ? `https://www.google.com/maps?q=${novedad.latitud},${novedad.longitud}` : "No registrado", 388, 376, 148);

    drawSectionTitle(doc, "Observaciones generales", 436);
    doc
      .roundedRect(52, 476, 492, 116, 6)
      .strokeColor("#dbe4ee")
      .stroke()
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#12324a")
      .text(novedad.observaciones || "Sin observaciones registradas.", 64, 490, { width: 468, height: 86 });

    if (fotos.length) {
      doc.addPage();
      drawSectionTitle(doc, "Evidencia fotográfica", 40);
      let y = 78;

      fotos.forEach((foto, index) => {
        y = ensureSpace(doc, y, 238);
        const x = index % 2 === 0 ? 52 : 306;
        if (index % 2 === 0 && index > 0) y += 8;

        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#12324a")
          .text(foto.etiqueta, x, y, { width: 220 });

        try {
          const imageData = `data:${foto.mimeType || "image/jpeg"};base64,${foto.imagenBase64}`;
          doc.image(imageData, x, y + 16, { fit: [220, 165], align: "center", valign: "center" });
        } catch {
          doc
            .roundedRect(x, y + 16, 220, 165, 6)
            .strokeColor("#dbe4ee")
            .stroke()
            .font("Helvetica")
            .fontSize(9)
            .fillColor("#b42318")
            .text("No se pudo renderizar esta imagen.", x + 12, y + 84, { width: 196, align: "center" });
        }

        if (index % 2 === 1) y += 208;
      });
    }

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
  const id = Number(cleanText(searchParams.get("id"), 20));

  if (!Number.isInteger(id) || id <= 0) {
    return json({ success: false, mensaje: "Id de novedad inválido." }, 400);
  }

  await ensureNovedadesSchema();

  const rows = await query(
    `SELECT id,
            codigo,
            DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') creadoEn,
            nombre_conductor nombreConductor,
            documento_conductor documentoConductor,
            tipo_vehiculo tipoVehiculo,
            placa,
            tipo_novedad tipoNovedad,
            otro_tipo otroTipo,
            lugar,
            latitud,
            longitud,
            observaciones
       FROM novedades_reportes
      WHERE id = :id
      LIMIT 1`,
    { id }
  );

  if (!rows.length) {
    return json({ success: false, mensaje: "Novedad no encontrada." }, 404);
  }

  const fotos = await query(
    `SELECT id, etiqueta, mime_type mimeType, imagen_base64 imagenBase64
       FROM novedades_fotos
      WHERE novedad_id = :id
      ORDER BY id ASC`,
    { id }
  );

  const pdf = await createNovedadPdf(rows[0], fotos);
  const codigo = rows[0].codigo || `NOV-${String(rows[0].id).padStart(4, "0")}`;

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="novedad_${codigo}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
