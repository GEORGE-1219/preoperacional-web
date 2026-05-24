/**
 * Cliente API JSONP para Google Apps Script
 * Reemplaza google.script.run en hosting externo
 * 
 * Este archivo maneja la comunicación con tu backend de Apps Script
 * usando JSONP para evitar problemas de CORS
 */

// Contador global para callbacks únicos
window._jsonpCallbackCounter = 0;

/**
 * Realiza una llamada JSONP a la API
 * @param {string} action - La acción a ejecutar (ej: 'obtenerVehiculos')
 * @param {object} params - Parámetros adicionales
 * @returns {Promise} - Promesa con el resultado
 */
function apiCall(action, params = {}) {
  return new Promise((resolve, reject) => {
    // Validar configuración
    if (API_CONFIG.API_URL.includes('TU_DEPLOYMENT_ID_AQUI')) {
      reject(new Error('API no configurada. Actualiza config.js con tu URL de Apps Script.'));
      return;
    }

    // Generar nombre único para el callback
    const callbackName = '_jsonpCallback' + (++window._jsonpCallbackCounter);
    
    // Timeout para la petición
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout: La petición tardó más de ' + (API_CONFIG.TIMEOUT / 1000) + ' segundos'));
    }, API_CONFIG.TIMEOUT);

    // Función de limpieza
    const cleanup = () => {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    // Callback global
    window[callbackName] = (data) => {
      cleanup();
      
      if (API_CONFIG.DEBUG) {
        console.log('✅ Respuesta API:', action, data);
      }
      
      if (data.success === false) {
        reject(new Error(data.error || 'Error desconocido en la API'));
      } else {
        resolve(data);
      }
    };

    // Construir URL con parámetros
    const urlParams = new URLSearchParams({
      action: action,
      callback: callbackName,
      ...params
    });

    const url = `${API_CONFIG.API_URL}?${urlParams.toString()}`;
    
    if (API_CONFIG.DEBUG) {
      console.log('📡 Petición API:', action, params);
    }

    // Crear script tag para JSONP
    const script = document.createElement('script');
    script.src = url;
    script.onerror = () => {
      cleanup();
      reject(new Error('Error al cargar el script de la API'));
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
      return await apiCall(action, params);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      if (API_CONFIG.DEBUG) {
        console.warn(`⚠️ Reintento ${i + 1}/${retries} para ${action}:`, error.message);
      }
      
      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

// ============================================
// FUNCIONES ESPECÍFICAS DEL NEGOCIO
// ============================================
// Solo se crean si NO existen en el contexto global (evita conflictos)

/**
 * Obtiene vehículos por tipo
 */
if (typeof window.obtenerVehiculos === 'undefined') {
  window.obtenerVehiculos = async function(tipo) {
    return await apiCallWithRetry('obtenerVehiculos', { tipo });
  };
}

/**
 * Guarda un preoperacional
 */
if (typeof window.guardarPreoperacionalAPI === 'undefined') {
  window.guardarPreoperacionalAPI = async function(datos) {
    return await apiCallWithRetry('guardarPreoperacional', {
      datos: JSON.stringify(datos)
    });
  };
}

/**
 * Obtiene información de un vehículo por placa
 */
if (typeof window.obtenerVehiculoPorPlaca === 'undefined') {
  window.obtenerVehiculoPorPlaca = async function(placa) {
    return await apiCallWithRetry('obtenerVehiculoPorPlaca', { placa });
  };
}

/**
 * Valida si un usuario está autorizado
 */
if (typeof window.validarUsuario === 'undefined') {
  window.validarUsuario = async function(documento) {
    return await apiCallWithRetry('validarUsuario', { documento });
  };
}

/**
 * Obtiene estadísticas generales
 */
if (typeof window.obtenerEstadisticas === 'undefined') {
  window.obtenerEstadisticas = async function() {
    return await apiCallWithRetry('obtenerEstadisticas');
  };
}

/**
 * Obtiene todos los registros con filtros opcionales
 */
if (typeof window.obtenerTodosLosRegistros === 'undefined') {
  window.obtenerTodosLosRegistros = async function(filtros = {}) {
    return await apiCallWithRetry('obtenerTodosLosRegistros', {
      filtros: JSON.stringify(filtros)
    });
  };
}

/**
 * Elimina un registro específico
 */
if (typeof window.eliminarRegistro === 'undefined') {
  window.eliminarRegistro = async function(tipo, fila) {
    return await apiCallWithRetry('eliminarRegistro', {
      tipo: tipo,
      fila: fila
    });
  };
}

/**
 * Exporta registros a CSV
 */
if (typeof window.exportarRegistros === 'undefined') {
  window.exportarRegistros = async function(tipo) {
    return await apiCallWithRetry('exportarRegistros', {
      tipo: tipo
    });
  };
}

// ============================================
// COMPATIBILIDAD CON CÓDIGO EXISTENTE
// ============================================

/**
 * Mock de google.script.run para compatibilidad
 * Permite usar el código existente sin cambios
 */
window.google = window.google || {};
window.google.script = {
  run: {
    withSuccessHandler: function(successCallback) {
      return {
        withFailureHandler: function(failureCallback) {
          return new Proxy({}, {
            get: function(target, prop) {
              return async function(...args) {
                try {
                  const result = await window[prop](...args);
                  if (successCallback) successCallback(result);
                  return result;
                } catch (error) {
                  if (failureCallback) failureCallback(error);
                  throw error;
                }
              };
            }
          });
        },
        // Sin failureHandler
        ...Object.fromEntries(
          Object.keys(window)
            .filter(key => typeof window[key] === 'function' && key.startsWith('obtener') || key === 'guardarPreoperacional' || key === 'validarUsuario')
            .map(funcName => [funcName, async function(...args) {
              try {
                const result = await window[funcName](...args);
                if (successCallback) successCallback(result);
                return result;
              } catch (error) {
                console.error('Error en', funcName, ':', error);
                throw error;
              }
            }])
        )
      };
    },
    // Sin successHandler
    withFailureHandler: function(failureCallback) {
      return {
        withSuccessHandler: function(successCallback) {
          return this.withSuccessHandler(successCallback).withFailureHandler(failureCallback);
        }
      };
    },
    // Llamadas directas
    ...Object.fromEntries(
      ['obtenerVehiculos', 'guardarPreoperacional', 'obtenerVehiculoPorPlaca', 'validarUsuario', 'obtenerEstadisticas', 'obtenerTodosLosRegistros', 'eliminarRegistro', 'exportarRegistros']
        .map(funcName => [funcName, async function(...args) {
          return await window[funcName](...args);
        }])
    )
  }
};

if (API_CONFIG.DEBUG) {
  console.log('✅ API Client cargado. Funciones disponibles:', 
    ['obtenerVehiculos', 'guardarPreoperacional', 'obtenerVehiculoPorPlaca', 
     'validarUsuario', 'obtenerEstadisticas', 'obtenerTodosLosRegistros',
     'eliminarRegistro', 'exportarRegistros']);
}
