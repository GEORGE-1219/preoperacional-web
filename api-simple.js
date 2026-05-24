/**
 * Cliente API JSONP para Google Apps Script - VERSIÓN SIMPLIFICADA
 * Sin conflictos con funciones existentes en webapp.html
 */

// Contador global para callbacks únicos
window._jsonpCallbackCounter = 0;

/**
 * Realiza una llamada JSONP a la API
 */
function apiCall(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (API_CONFIG.API_URL.includes('TU_DEPLOYMENT_ID_AQUI')) {
      reject(new Error('API no configurada. Actualiza config.js'));
      return;
    }

    const callbackName = '_jsonpCallback' + (++window._jsonpCallbackCounter);
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout: La petición tardó más de ' + (API_CONFIG.TIMEOUT / 1000) + ' segundos'));
    }, API_CONFIG.TIMEOUT);

    const cleanup = () => {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    window[callbackName] = (data) => {
      cleanup();
      if (API_CONFIG.DEBUG) {
        console.log('✅ Respuesta API:', action, data);
      }
      if (data.success === false) {
        reject(new Error(data.error || 'Error desconocido'));
      } else {
        resolve(data);
      }
    };

    const urlParams = new URLSearchParams({
      action: action,
      callback: callbackName,
      ...params
    });

    const url = `${API_CONFIG.API_URL}?${urlParams.toString()}`;
    
    if (API_CONFIG.DEBUG) {
      console.log('📡 Petición:', action, params);
    }

    const script = document.createElement('script');
    script.src = url;
    script.onerror = () => {
      cleanup();
      reject(new Error('Error al cargar script. Verifica que desplegaste como "Cualquier usuario"'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Reintenta una operación en caso de fallo
 */
async function apiCallWithRetry(action, params = {}, retries = API_CONFIG.MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      if (API_CONFIG.DEBUG && i > 0) {
        console.log(`🔄 Reintento ${i + 1}/${retries} para acción: ${action}`);
      }
      return await apiCall(action, params);
    } catch (error) {
      if (i === retries - 1) throw error;
      if (API_CONFIG.DEBUG) {
        console.warn(`⚠️ Reintento ${i + 1}/${retries}:`, error.message);
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

// ============================================
// API OBJECT - Usa esto desde tu HTML
// ============================================

window.API = {
  obtenerVehiculos: async function(tipo) {
    return await apiCallWithRetry('obtenerVehiculos', { tipo });
  },
  
  guardarPreoperacional: async function(datos) {
    return await apiCallWithRetry('guardarPreoperacional', {
      datos: JSON.stringify(datos)
    });
  },
  
  obtenerVehiculoPorPlaca: async function(placa) {
    return await apiCallWithRetry('obtenerVehiculoPorPlaca', { placa });
  },
  
  validarUsuario: async function(documento) {
    return await apiCallWithRetry('validarUsuario', { documento });
  },
  
  obtenerEstadisticas: async function() {
    return await apiCallWithRetry('obtenerEstadisticas');
  },
  
  obtenerTodosLosRegistros: async function(filtros = {}) {
    return await apiCallWithRetry('obtenerTodosLosRegistros', {
      filtros: JSON.stringify(filtros)
    });
  },
  
  eliminarRegistro: async function(tipo, fila) {
    return await apiCallWithRetry('eliminarRegistro', { tipo, fila });
  },
  
  exportarRegistros: async function(tipo) {
    return await apiCallWithRetry('exportarRegistros', { tipo });
  },
  
  desbloquearVehiculo: async function(placa, tipo) {
    return await apiCallWithRetry('desbloquearVehiculo', { placa, tipo });
  }
};

if (API_CONFIG.DEBUG) {
  console.log('✅ API Client cargado');
  console.log('📚 Usa: API.obtenerVehiculos("MOTO")');
  console.log('📚 Usa: API.guardarPreoperacional(datos)');
}
