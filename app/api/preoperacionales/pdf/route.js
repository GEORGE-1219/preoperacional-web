import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getBrandLogoDataUri } from "@/lib/brand-assets";
import { CHECKLISTS } from "@/lib/checklist";
import { cleanText, json, query } from "@/lib/db";
import { ensureEvidenceSchema } from "@/lib/evidence-schema";
import { analyzeInspection } from "@/lib/inspection-analysis";
import { ensurePreoperacionalConsecutivoSchema, preoperacionalCode } from "@/lib/preoperacionales";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sectionMap(tipo) {
  return CHECKLISTS[tipo] || [];
}

function drawTitle(doc, title, subtitle) {
  doc.rect(0, 0, 595.28, 98).fill("#f1f6fb");
  doc.rect(0, 0, 595.28, 16).fill("#0066b3");
  drawLogo(doc, 40, 28, 120, 42);
  doc
    .fillColor("#12324a")
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(title, 180, 36, { width: 230, lineBreak: false });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#657486")
    .text(subtitle, 180, 62, { width: 230, lineBreak: false });
}

function drawLogo(doc, x, y, width, height) {
  const logo = getBrandLogoDataUri();
  if (!logo) return;

  doc.roundedRect(x, y, width, height, 6).fill("#ffffff");
  doc.image(logo, x + 8, y + 7, { fit: [width - 16, height - 14], align: "center", valign: "center" });
}

function sectionTitle(doc, title, y) {
  doc
    .roundedRect(40, y, 515, 22, 4)
    .fill("#0066b3")
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(title, 52, y + 6);
}

function field(doc, label, value, x, y, width) {
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor("#657486")
    .text(label.toUpperCase(), x, y, { width });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#12324a")
    .text(value || "No registrado", x, y + 11, { width });
}

function ensureSpace(doc, y, needed = 80) {
  if (y + needed <= 760) return y;
  doc.addPage();
  return 40;
}

function createPdf(registro, fotos) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Preoperacional ${registro.placa}` } });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const checklist = JSON.parse(registro.checklist || "{}");
    const codigo = registro.codigo || preoperacionalCode(registro.id);
    drawTitle(doc, "Registro preoperacional", `A&A Comunicaciones - ${codigo}`);

    doc
      .roundedRect(420, 32, 135, 44, 6)
      .fill("#2d7a3e")
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(codigo, 430, 39, { width: 115, align: "center" })
      .fontSize(8)
      .text(`${registro.placa} · ${registro.tipo}`, 430, 62, { width: 115, align: "center" });

    sectionTitle(doc, "Datos generales", 116);
    field(doc, "Consecutivo", codigo, 52, 154, 120);
    field(doc, "Fecha", registro.fecha, 190, 154, 150);
    field(doc, "Usuario", registro.usuario, 358, 154, 170);
    field(doc, "Documento", registro.documento, 52, 204, 130);
    field(doc, "Tipo", registro.tipo, 190, 204, 95);
    field(doc, "Modelo", registro.modelo, 303, 204, 225);
    field(doc, "Destino", registro.destino, 190, 254, 270);
    field(doc, "Kilometraje", String(registro.kilometraje || ""), 52, 254, 130);

    const analysis = analyzeInspection(registro.tipo, checklist);
    sectionTitle(doc, "Dictamen preventivo", 304);
    doc
      .roundedRect(52, 340, 492, 74, 6)
      .fill(analysis.estado === "No apto" ? "#fff0ed" : analysis.estado === "Apto" ? "#edf9f0" : "#fff8df");
    doc
      .fillColor("#12324a")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("ESTADO", 64, 352, { width: 90 })
      .fontSize(15)
      .text(analysis.estado, 64, 366, { width: 120 })
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#657486")
      .text("CONCLUSIÓN", 204, 352, { width: 320 })
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#12324a")
      .text(analysis.conclusion, 204, 366, { width: 318, height: 34 });

    let y = 438;
    for (const section of sectionMap(registro.tipo)) {
      y = ensureSpace(doc, y, 46);
      sectionTitle(doc, section.section, y);
      y += 32;

      for (const [key, label] of section.items) {
        y = ensureSpace(doc, y, 28);
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#12324a")
          .text(label, 52, y, { width: 360 });
        doc
          .roundedRect(430, y - 2, 100, 18, 9)
          .fill(checklist[key] === "Malo" || checklist[key] === "No cumple" ? "#ffe0dc" : checklist[key] === "Regular" || checklist[key] === "No aplica" ? "#fff1bd" : "#dcf6e2")
          .fillColor("#12324a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(checklist[key] || "Sin dato", 440, y + 3, { width: 80, align: "center" });
        y += 24;
      }
    }

    y = ensureSpace(doc, y, 95);
    sectionTitle(doc, "Observaciones", y);
    doc
      .roundedRect(52, y + 36, 492, 58, 6)
      .strokeColor("#dbe4ee")
      .stroke()
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#12324a")
      .text(registro.observaciones || "Sin observaciones.", 64, y + 48, { width: 468, height: 34 });

    if (fotos.length) {
      doc.addPage();
      sectionTitle(doc, "Evidencia fotográfica", 40);
      y = 78;

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
          const imageData = `data:${foto.mime_type || "image/jpeg"};base64,${foto.imagen_base64}`;
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
      .fontSize(8)
      .fillColor("#657486")
      .text(`Generado el ${new Date().toLocaleString("es-CO")}`, 40, 775);

    doc.end();
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = Number(cleanText(searchParams.get("id"), 20));

  if (!Number.isInteger(id) || id <= 0) {
    return json({ success: false, mensaje: "Id de preoperacional inválido." }, 400);
  }

  await ensureEvidenceSchema();
  await ensurePreoperacionalConsecutivoSchema();

  const registros = await query(
    `SELECT id, codigo, tipo_vehiculo tipo, DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') fecha,
            nombre_usuario usuario, documento_usuario documento, placa, modelo,
            sitio_destino destino, kilometraje, checklist, observaciones
       FROM preoperacionales
      WHERE id = :id
      LIMIT 1`,
    { id }
  );

  if (!registros.length) {
    return json({ success: false, mensaje: "Preoperacional no encontrado." }, 404);
  }

  const fotos = await query(
    `SELECT codigo, etiqueta, mime_type, imagen_base64
       FROM preoperacional_fotos
      WHERE preoperacional_id = :id
      ORDER BY id ASC`,
    { id }
  );

  const pdf = await createPdf(registros[0], fotos);
  const codigo = registros[0].codigo || preoperacionalCode(registros[0].id);

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="preoperacional_${codigo}_${registros[0].placa}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
