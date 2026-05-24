import { CHECKLISTS } from "./checklist";

const BAD_VALUES = new Set(["Malo", "No cumple"]);
const WARNING_VALUES = new Set(["Regular", "No aplica"]);
const CRITICAL_PATTERNS = [
  ["motor", "Motor"],
  ["aceite motor", "Motor"],
  ["freno", "Frenos"],
  ["liquido frenos", "Frenos"],
  ["luces", "Luces"],
  ["luz", "Luces"],
  ["farola", "Luces"],
  ["stop", "Luces"],
  ["reversa", "Luces"],
  ["direccional", "Luces"]
];

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseChecklist(checklist) {
  if (!checklist) return {};
  if (typeof checklist === "string") {
    try {
      return JSON.parse(checklist);
    } catch {
      return {};
    }
  }
  return checklist;
}

function criticalGroup(section, key, label) {
  const haystack = normalize(`${section} ${key} ${label}`);
  const match = CRITICAL_PATTERNS.find(([pattern]) => haystack.includes(pattern));
  return match?.[1] || null;
}

export function analyzeInspection(tipo, checklistInput) {
  const checklist = parseChecklist(checklistInput);
  const badItems = [];
  const warningItems = [];
  const criticalBadItems = [];
  let totalItems = 0;
  let answeredItems = 0;

  for (const section of CHECKLISTS[tipo] || []) {
    for (const [key, label] of section.items) {
      const value = checklist[key];
      totalItems += 1;
      if (value) answeredItems += 1;
      const item = {
        key,
        label,
        section: section.section,
        value,
        criticalGroup: criticalGroup(section.section, key, label)
      };

      if (BAD_VALUES.has(value)) {
        badItems.push(item);
        if (item.criticalGroup) criticalBadItems.push(item);
      } else if (WARNING_VALUES.has(value)) {
        warningItems.push(item);
      }
    }
  }

  let estado = "Apto";
  let conclusion = "El vehículo se considera apto para conducir. No se registran fallas críticas.";

  if (criticalBadItems.length) {
    estado = "No apto";
    conclusion = "No apto para conducir: existen fallas críticas en motor, frenos o luces.";
  } else if (answeredItems < totalItems) {
    estado = "Pendiente";
    conclusion = "Diligencie todos los ítems para obtener el dictamen final de aptitud.";
  } else if (badItems.length >= 3) {
    estado = "No apto";
    conclusion = "No apto para conducir: presenta varias fallas en mal estado que requieren revisión.";
  } else if (badItems.length || warningItems.length) {
    estado = "Observaciones";
    conclusion = badItems.length
      ? "Apto condicionado: no hay fallas críticas, pero existen elementos en mal estado que deben corregirse."
      : "Apto con observaciones: existen elementos regulares o no aplicables por revisar.";
  }

  return {
    estado,
    conclusion,
    badItems,
    warningItems,
    criticalBadItems,
    totalItems,
    answeredItems,
    isFit: estado !== "No apto"
  };
}
