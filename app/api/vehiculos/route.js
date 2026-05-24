import { cleanText, json, normalizeTipo, query } from "@/lib/db";
import { ensureVehicleSchema } from "@/lib/vehicle-schema";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tipo = normalizeTipo(searchParams.get("tipo"));
  const includeInactive = searchParams.get("includeInactive") === "1";

  if (searchParams.has("tipo") && !tipo) {
    return json({ success: false, mensaje: "Tipo de vehículo no válido." }, 400);
  }

  try {
    await ensureVehicleSchema();
  } catch (error) {
    return json({ success: false, mensaje: error.message }, 409);
  }

  const rows = await query(
    `SELECT v.id, v.tipo, v.placa, v.modelo, v.marca, v.linea, v.color,
            v.clase_servicio claseServicio, v.numero_motor numeroMotor,
            v.numero_chasis numeroChasis, v.propietario, v.responsable,
            v.aseguradora_soat aseguradoraSOAT, v.numero_soat numeroSOAT,
            v.observaciones, v.activo,
            DATE_FORMAT(v.fecha_inicio_soat, '%Y-%m-%d') fechaInicioSOAT,
            DATE_FORMAT(v.fecha_vencimiento_soat, '%Y-%m-%d') fechaVencimientoSOAT,
            DATE_FORMAT(v.fecha_inicio_tecnomecanica, '%Y-%m-%d') fechaInicioTecnomecanica,
            DATE_FORMAT(v.fecha_vencimiento_tecnomecanica, '%Y-%m-%d') fechaVencimientoTecnomecanica,
            DATE_FORMAT(v.fecha_matricula, '%Y-%m-%d') fechaMatricula,
            p.nombre_usuario usuarioOcupado,
            DATE_FORMAT(p.fecha_registro, '%H:%i') horaRegistro,
            p.id preoperacionalActivoId
       FROM vehiculos v
       LEFT JOIN preoperacionales p
         ON p.placa = v.placa
        AND p.tipo_vehiculo = v.tipo
        AND DATE(p.fecha_registro) = CURRENT_DATE()
        AND p.liberado_en IS NULL
      WHERE (:tipo IS NULL OR v.tipo = :tipo)
        AND (:includeInactive = 1 OR v.activo = 1)
      ORDER BY v.tipo ASC, v.placa ASC`,
    { tipo, includeInactive: includeInactive ? 1 : 0 }
  );

  const seen = new Set();
  const vehiculos = rows
    .filter((row) => {
      if (seen.has(row.placa)) return false;
      seen.add(row.placa);
      return true;
    })
    .map((row) => ({
      ...row,
      ocupado: Boolean(row.preoperacionalActivoId)
    }));

  return json(vehiculos);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const tipo = normalizeTipo(body.tipo);
  const placa = cleanText(body.placa, 20).toUpperCase();

  if (!tipo || !placa) {
    return json({ success: false, mensaje: "Tipo y placa son obligatorios." }, 400);
  }

  try {
    await ensureVehicleSchema();
  } catch (error) {
    return json({ success: false, mensaje: error.message }, 409);
  }

  await query(
    `INSERT INTO vehiculos
      (tipo, placa, modelo, marca, linea, color, clase_servicio, numero_motor, numero_chasis,
       propietario, responsable, aseguradora_soat, numero_soat, fecha_inicio_soat,
       fecha_vencimiento_soat, fecha_inicio_tecnomecanica, fecha_vencimiento_tecnomecanica,
       fecha_matricula, observaciones, activo)
     VALUES
      (:tipo, :placa, :modelo, :marca, :linea, :color, :claseServicio, :numeroMotor, :numeroChasis,
       :propietario, :responsable, :aseguradoraSOAT, :numeroSOAT, :fechaInicioSOAT,
       :fechaVencimientoSOAT, :fechaInicioTecnomecanica, :fechaVencimientoTecnomecanica,
       :fechaMatricula, :observaciones, :activo)
     ON DUPLICATE KEY UPDATE
      modelo = VALUES(modelo),
      marca = VALUES(marca),
      linea = VALUES(linea),
      color = VALUES(color),
      clase_servicio = VALUES(clase_servicio),
      numero_motor = VALUES(numero_motor),
      numero_chasis = VALUES(numero_chasis),
      propietario = VALUES(propietario),
      responsable = VALUES(responsable),
      aseguradora_soat = VALUES(aseguradora_soat),
      numero_soat = VALUES(numero_soat),
      fecha_inicio_soat = VALUES(fecha_inicio_soat),
      fecha_vencimiento_soat = VALUES(fecha_vencimiento_soat),
      fecha_inicio_tecnomecanica = VALUES(fecha_inicio_tecnomecanica),
      fecha_vencimiento_tecnomecanica = VALUES(fecha_vencimiento_tecnomecanica),
      fecha_matricula = VALUES(fecha_matricula),
      observaciones = VALUES(observaciones),
      activo = VALUES(activo)`,
    {
      tipo,
      placa,
      modelo: cleanText(body.modelo, 80),
      marca: cleanText(body.marca, 80),
      linea: cleanText(body.linea, 80),
      color: cleanText(body.color, 60),
      claseServicio: cleanText(body.claseServicio, 80),
      numeroMotor: cleanText(body.numeroMotor, 80),
      numeroChasis: cleanText(body.numeroChasis, 80),
      propietario: cleanText(body.propietario, 160),
      responsable: cleanText(body.responsable, 160),
      aseguradoraSOAT: cleanText(body.aseguradoraSOAT, 120),
      numeroSOAT: cleanText(body.numeroSOAT, 80),
      fechaInicioSOAT: body.fechaInicioSOAT || null,
      fechaVencimientoSOAT: body.fechaVencimientoSOAT || null,
      fechaInicioTecnomecanica: body.fechaInicioTecnomecanica || null,
      fechaVencimientoTecnomecanica: body.fechaVencimientoTecnomecanica || null,
      fechaMatricula: body.fechaMatricula || null,
      observaciones: cleanText(body.observaciones, 1000),
      activo: body.activo === false ? 0 : 1
    }
  );

  return json({ success: true, mensaje: "Vehículo guardado." }, 201);
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const tipo = normalizeTipo(body.tipo);
  const placa = cleanText(body.placa, 20).toUpperCase();

  if (!tipo || !placa) {
    return json({ success: false, mensaje: "Tipo y placa son obligatorios." }, 400);
  }

  await query(
    "UPDATE vehiculos SET activo = :activo WHERE tipo = :tipo AND placa = :placa LIMIT 1",
    { tipo, placa, activo: body.activo ? 1 : 0 }
  );

  return json({ success: true, mensaje: "Estado actualizado." });
}
