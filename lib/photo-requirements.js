export const PHOTO_REQUIREMENTS = {
  MOTO: [
    ["frontal", "Foto frontal"],
    ["trasera", "Foto trasera"],
    ["lateralDerecho", "Lado derecho"],
    ["lateralIzquierdo", "Lado izquierdo"],
    ["nivelAceite", "Nivel del aceite"]
  ],
  CARRO: [
    ["frontal", "Foto frontal"],
    ["trasera", "Foto trasera"],
    ["lateralDerecho", "Lado derecho"],
    ["lateralIzquierdo", "Lado izquierdo"],
    ["motor", "Foto del motor"],
    ["nivelAceite", "Nivel del aceite"]
  ],
  GRUA: [
    ["frontal", "Foto frontal"],
    ["trasera", "Foto trasera"],
    ["lateralDerecho", "Lado derecho"],
    ["lateralIzquierdo", "Lado izquierdo"],
    ["motor", "Foto del motor"],
    ["nivelAceite", "Nivel del aceite"]
  ]
};

export function photoRequirements(tipo) {
  return PHOTO_REQUIREMENTS[tipo] || [];
}
