/**
 * Configuración de la API para hosting externo
 * 
 * INSTRUCCIONES:
 * 1. Despliega Codigo_API_REST.gs como Web App en Google Apps Script
 * 2. Configura: "Ejecutar como: Tu cuenta" y "Acceso: Cualquier usuario"
 * 3. Copia la URL que termina en /exec
 * 4. Pégala aquí en API_URL
 */

const API_CONFIG = {
  // ⚠️ REEMPLAZA ESTA URL CON TU URL DE APPS SCRIPT
  API_URL: 'https://script.google.com/macros/s/AKfycbw37R5M5ypaewCh3oDm9TuFBdLgDYTxqEV7rLjnupeffQW3NW-W9a72Hvxzc81j4wgC/exec',
  
  // Tiempo máximo de espera para peticiones (milisegundos)
  TIMEOUT: 30000,
  
  // Número de reintentos en caso de fallo
  MAX_RETRIES: 3,
  
  // Modo debug (muestra logs en consola)
  DEBUG: true
};

// Validar configuración al cargar
if (API_CONFIG.DEBUG) {
  if (API_CONFIG.API_URL.includes('TU_DEPLOYMENT_ID_AQUI')) {
    console.error('⚠️ CONFIGURACIÓN PENDIENTE: Debes actualizar API_URL en config.js con tu URL de Apps Script');
  } else {
    console.log('✅ API configurada:', API_CONFIG.API_URL);
  }
}
