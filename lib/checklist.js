export const CHECKLISTS = {
  MOTO: [
    {
      section: "MOTOCICLETA",
      items: [
        ["nivelAceite", "Nivel de Aceite"],
        ["manilaresDir", "Manilares y Dirección"],
        ["combustible", "Combustible"],
        ["llantas", "Llantas"],
        ["chasisGuarda", "Chasis y Guardabarros"],
        ["frenos", "Frenos"],
        ["trenArrastre", "Tren de Arrastre"],
        ["retrovisores", "Retrovisores"],
        ["lucesAltasBajas", "Luces Altas y Bajas"],
        ["suspension", "Suspensión"],
        ["bocina", "Bocina"],
        ["direccionalesStop", "Direccionales y Stop"]
      ]
    }
  ],
  CARRO: [
    { section: "NEUMÁTICOS", items: [["neuDelDer", "Delantero Derecho"], ["neuDelIzq", "Delantero Izquierdo"], ["neuTraDer", "Trasero Derecho"], ["neuTraIzq", "Trasero Izquierdo"], ["neuRepuesto", "Repuesto"]] },
    { section: "LUCES", items: [["lucesAltas", "Altas"], ["lucesBajas", "Bajas"], ["lucesStop", "Stop"], ["lucesReversa", "Reversa"], ["lucesParqueo", "Parqueo"]] },
    { section: "LIMPIAPARABRISAS", items: [["limpIzq", "Izquierdo"], ["limpDer", "Derecho"], ["limpTracero", "Trasero"]] },
    { section: "FRENOS", items: [["frenosDelanteros", "Delanteros"], ["frenosTraseros", "Traseros"], ["frenoEstacionamiento", "Estacionamiento"]] },
    { section: "DIRECCIONALES", items: [["direccDelanteras", "Delanteras"], ["direccTraceras", "Traseras"]] },
    { section: "VIDRIOS Y ESPEJOS", items: [["vidrioDelantero", "Vidrio Delantero"], ["vidrioTracero", "Vidrio Trasero"], ["ventanasLaterales", "Ventanas Laterales"], ["espejoRetrovisor", "Espejo Retrovisor"], ["espejosLaterales", "Espejos Laterales"]] },
    { section: "NIVEL DE FLUIDOS", items: [["nivelAceite", "Aceite"], ["nivelFrenos", "Frenos"], ["nivelRefrigerante", "Refrigerante"]] },
    { section: "OTROS", items: [["bocina", "Bocina"], ["alarmaReversa", "Alarma Reversa"], ["elevavidrios", "Elevavidrios"], ["puertas", "Puertas"], ["tableroControles", "Tablero Controles"], ["cinturonesSeguridad", "Cinturones/Seguridad"]] },
    { section: "HERRAMIENTAS", items: [["triangulosReflect", "Triángulos Reflectores"], ["gato", "Gato"], ["cajaHerramientas", "Caja de Herramientas"], ["cruceta", "Cruceta"], ["tacos", "Tacos"], ["cablesArranque", "Cables de Arranque"]] },
    { section: "SEGURIDAD", items: [["botiquin", "Botiquín"], ["extintor", "Extintor"], ["paletaPareSiga", "Paleta Pare/Siga"], ["chalecoReflect", "Chaleco Reflectivo"], ["conoSenal4", "Cono de Señalización 4 UND"], ["cintaSenal", "Cinta Señalización"]] }
  ],
  GRUA: [
    {
      section: "NIVELES",
      items: [
        ["aceiteMotor", "Aceite de motor"],
        ["combustible", "Combustible"],
        ["hidraulico", "Hidráulico"],
        ["liquidoFrenos", "Líquido de frenos"],
        ["refrigerante", "Refrigerante"]
      ]
    },
    {
      section: "COFRE",
      items: [
        ["estadoMangueras", "Estado general de mangueras"],
        ["estadoCorreas", "Estado de correas"],
        ["cableadoElectrico", "Cableado eléctrico"],
        ["conexionBateria", "Conexiones y estado de la batería"],
        ["fugasGeneral", "Verificación de fugas en general"]
      ]
    },
    {
      section: "CONJUNTO DE LUCES Y SEÑALES AUDIBLES",
      items: [
        ["estadoFarolas", "Estado general de las farolas sin fisuras o rotas"],
        ["lucesAltasBajas", "Funcionamiento de luces altas y bajas"],
        ["lucesParqueoDireccionales", "Funcionamiento luces de parqueo, direccionales delanteras y traseras"],
        ["stopReversa", "Stop y luz de reversa"],
        ["pito", "Pito"],
        ["alarmaReversa", "Alarma de reversa"]
      ]
    },
    {
      section: "ESTADO FÍSICO Y MECÁNICO",
      items: [
        ["llantas", "Llantas, presión y labrado"],
        ["espejosRetrovisores", "Espejos retrovisores, faltantes o fisuras"],
        ["limpiaparabrisas", "Bomba y plumillas de limpiaparabrisas"],
        ["desairadoFiltros", "Desairado filtros de combustión"],
        ["tableroIndicadores", "Tablero de indicadores y testigos"],
        ["juegoDireccion", "Verificar juego en la dirección"],
        ["pedalFreno", "Recorrido del pedal del freno y freno de estacionamiento"],
        ["pedalEmbrague", "Recorrido del pedal del embrague"],
        ["cinturonesSeguridad", "Cinturones de seguridad en buen estado y habilitados"]
      ]
    },
    {
      section: "EQUIPO DE PREVENCIÓN Y SEGURIDAD",
      items: [
        ["gato", "Gato con capacidad para elevar el vehículo"],
        ["cruceta", "Cruceta"],
        ["senalesCarretera", "Dos señales de carretera reflectivas o lámparas de señal"],
        ["tacos", "Dos tacos para bloquear el vehículo"],
        ["cajaHerramientas", "Caja de herramienta básica"],
        ["linternaPilas", "Linterna y dos pares de pilas"],
        ["llantaRepuesto", "Llanta de repuesto, presión y labrado"],
        ["extintor", "Extintor, presión y vigencia"],
        ["botiquin", "Botiquín acorde al estándar de la empresa"],
        ["kitDerrames", "Kit control de derrames"]
      ]
    },
    {
      section: "SISTEMA DE ELEVACIÓN DE LA CANASTILLA",
      items: [
        ["equipoSinCorrosion", "Equipo sin corrosión ni fisuras"],
        ["paradaEmergencia", "Estado parada de emergencia"],
        ["despliegueEquipo", "Despliegue adecuado del equipo"],
        ["nivelAceiteHidraulico", "Nivel de aceite hidráulico"],
        ["controlesHidraulicos", "Funcionamiento de controles hidráulicos superiores e inferiores"],
        ["estabilizadoresZapatas", "Estabilizadores operativos, firmes, sin fugas y zapatas"],
        ["tomaFuerzaAceleracion", "Sistema de toma de fuerza y aceleración"],
        ["combustibleUnidadAuxiliar", "Provisión de combustible de la unidad o del motor auxiliar"],
        ["caboCableTensor", "Estado del cabo o cable tensor"],
        ["fugasSistemaHidraulico", "Fugas en gatos o sistemas hidráulicos"],
        ["cilindrosTelescopicos", "Estado de cilindros telescópicos"],
        ["despliegueEquipoSegundo", "Despliegue adecuado del equipo"],
        ["motorWinche", "Estado del motor del winche"],
        ["extensionRetraccionBrazo", "Operación de extensión y retracción del brazo"],
        ["giroBrazo", "Giro del brazo a la izquierda y a la derecha"]
      ]
    },
    {
      section: "CANASTILLA",
      items: [
        ["anclajeBrazo", "El anclaje del brazo está ajustado y no presenta movimiento"],
        ["estadoCanastilla", "La canastilla está en buen estado, sin fisuras o daños aparentes"],
        ["aislamientosElectricos", "Aislamientos eléctricos en buen estado"],
        ["controlesSenalizados", "Los controles están en buen estado y señalizados"],
        ["capacidadCarga", "Está identificada la capacidad de carga"]
      ]
    }
  ]
};

export function checklistOptions(tipo) {
  return tipo === "GRUA" ? ["Cumple", "No cumple", "No aplica"] : ["Bueno", "Regular", "Malo"];
}

export function checklistKeys(tipo) {
  return (CHECKLISTS[tipo] || []).flatMap((section) => section.items.map(([key]) => key));
}
