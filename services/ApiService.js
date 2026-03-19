import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import LocationService from './LocationService';
import NetworkService from './NetworkService';

// Función para generar un GUID tipo hash hexa padded
function getGUID(mac) {
  let hash = 0;
  if (!mac) return '';
  for (let i = 0; i < mac.length; i++) {
    hash = ((hash << 5) - hash) + mac.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

//LOCAL
const BASE_URL = 'http://localhost:5001/api/v1.0';

// APP
//const BASE_URL = 'http://186.5.29.68:9711/api/v1.0';
// Obtener MAC (AndroidID) de forma segura

let mac = '';

try {
  mac = Device.osInternalBuildId || Device.deviceName || Device.modelId || '';
} catch (error) {
  console.warn('Error obteniendo Device ID:', error);
  mac = '';
}
// IMEI es un GUID calculado a partir de la MAC
let imei = getGUID(mac);

mac = 'RP1A.200720.011';
imei = '000000006CC6CCA5';

class ApiService {
  static async obtenerDistribuidos({usuario}) {
    const url = `${BASE_URL}/Distribuidos/obtenerDistribuidos`;
    try {
      const isConnected = await NetworkService.checkConnection();
      const token = await this.getAuthToken();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }
      
      const location = await LocationService.getLocation();
      const body = {
        usuario,
        imei,
        mac,
        latitud: location.latitud,
        longitud: location.longitud
      };
      
      console.log('Solicitando catálogos a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      // Primero obtener el texto de la respuesta
      const responseText = await response.text();
      //console.log('Respuesta del servidor (texto):', responseText);
      
      if (!response.ok) {
        let errorMessage = `Error al obtener catálogos (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          // Si no se puede parsear como JSON, usar el texto plano
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Si la respuesta es exitosa, intentar parsear como JSON
      try {
        const data = responseText ? JSON.parse(responseText) : {};
        //console.log('Datos parseados:', JSON.stringify(data, null, 2));
        
        // Verificar si la respuesta tiene la estructura esperada
        if (!data.tiposIdentificaciones || !data.tiposAlertas || !data.paises || !data.estadoCivil) {
          console.warn('La respuesta no tiene la estructura esperada:', data);
          // Devolver la respuesta de todos modos, ya que puede ser válida pero con estructura diferente
        }
        
        return data;
      } catch (e) {
        //console.error('Error al parsear respuesta JSON:', e);
        //console.error('Texto que no se pudo parsear:', responseText);
        throw new Error('Formato de respuesta inválido');
      }
    } catch (error) {
      //console.error('Error en obtenerDistribuidos:', error);
      throw error;
    }
  }

  static async login({ usuario, contrasenia}) {
    const url = `${BASE_URL}/Usuario/login`;
    try {
      console.log('=== INICIO LOGIN ===');
      console.log('URL:', url);
      console.log('BASE_URL:', BASE_URL);
      
      const isConnected = await NetworkService.checkConnection();
      console.log('Estado de conexión:', isConnected);
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }
      
      // Obtener ubicación con timeout para no bloquear
      let location;
      try {
        location = await Promise.race([
          LocationService.getLocation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout obteniendo ubicación')), 15000)
          )
        ]);
      } catch (locationError) {
        console.warn('Error obteniendo ubicación, usando valores por defecto:', locationError);
        location = { latitud: 0, longitud: 0 };
      }
      
      const usuarioMayusculas = (usuario != null && usuario !== '')
        ? String(usuario).trim().toUpperCase()
        : usuario;
      const body = {
        usuario: usuarioMayusculas,
        contrasenia,
        imei,
        mac,
        latitud: location.latitud,
        longitud: location.longitud,
      };

      console.log('Intentando login en:', url);
      console.log('Body enviado:', JSON.stringify(body, null, 2));
      
      // Fetch con timeout usando AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
      
      let response;
      try {
        console.log('Iniciando petición fetch...');
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log('Respuesta recibida, status:', response.status);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Error en fetch:', fetchError);
        console.error('Error name:', fetchError.name);
        console.error('Error message:', fetchError.message);
        console.error('Error stack:', fetchError.stack);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Tiempo de espera agotado. Verifique su conexión a internet.');
        }
        if (fetchError.message && fetchError.message.includes('Network request failed')) {
          throw new Error('No se pudo conectar al servidor. Verifique su conexión a internet y que el servidor esté disponible.');
        }
        throw fetchError;
      }
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text; // Es texto plano, no JSON
      }
      if (!response.ok) {
        const mensaje = typeof data === 'object' ? data?.mensaje : data;
        throw new Error(mensaje || 'Error en autenticación');
      }
      if (data.token) await AsyncStorage.setItem('authToken', data.token);
      return data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  static async getAuthToken() {
    return AsyncStorage.getItem('authToken');
  }

  static async solicitudActivacion({ usuario, contrasenia }) {
    const url = `${BASE_URL}/Usuario/solicitudActivacion`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }
      const location = await LocationService.getLocation();
      const body = {
        usuario,
        contrasenia,
        imei,
        mac,
        latitud: location.latitud,
        longitud: location.longitud,
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      //const text = await response.text();
      let data;
      try {
        data = JSON.parse(await response.text());
      } catch (e) {
        data = await response.text(); // Es texto plano, no JSON
      }
      if (!response.ok) {
        const mensaje = typeof data === 'object' ? data?.mensaje : data;
        throw new Error(mensaje || 'Error en solicitud de activación');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }
  static async crearAlerta({ idTipo, descripcion, usuario }) {
    const location = await LocationService.getLocation();
    const now = new Date();
    const fecha = now.toISOString();
    const hora = now.toTimeString().slice(0, 8);
    const body = {
      fecha,
      hora,
      descripcion,
      idTipo,
      usuario,
      imei,
      latitud: location.latitud,
      longitud: location.longitud,
      mac,
    };
    const url = `${BASE_URL}/Alerta/crearAlerta`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) throw new Error('Sin conexión a internet');
      const token = await this.getAuthToken();      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify(body),
      });
      //console.log('respuesta:', response);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }
      if (!response.ok) {
        const mensaje = typeof data === 'object' ? data?.mensaje : data;
        throw new Error(mensaje || 'Error al registrar alerta');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async listarAlertas({ cantidadElementos = 5, usuario }) {
    const location = await LocationService.getLocation();
    const body = {
      cantidadElementos,
      usuario,
      imei,
      latitud: location.latitud,
      longitud: location.longitud,
      mac,
    };
    const url = `${BASE_URL}/Alerta/listarAlertas`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) throw new Error('Sin conexión a internet');
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify(body),
      });
      //const text = await response.text();
      let data;
      try {
        data = JSON.parse(await response.text());
      } catch (e) {
        data = await response.text();
      }
      if (!response.ok) {
        const mensaje = typeof data === 'object' ? data?.mensaje : data;
        throw new Error(mensaje || 'Error al listar alertas');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca un cliente por su identificación
   * @param {Object} params - Parámetros de búsqueda
   * @param {string} params.identificacion - Número de identificación del cliente
   * @param {number} params.secuencialTipoIdentificacion - ID del tipo de identificación
   * @param {string} params.usuario - Nombre de usuario del corresponsal
   * @returns {Promise<Object>} - Datos del cliente encontrado
   */
  static async buscarCliente({ identificacion, secuencialTipoIdentificacion, usuario }) {
    const url = `${BASE_URL}/Cliente/buscarCliente`;
    try {
      const isConnected = await NetworkService.checkConnection();
      const token = await this.getAuthToken();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }
      
      const location = await LocationService.getLocation();
      const body = {
        identificacion,
        secuencialTipoIdentificacion,
        usuario,
        imei,
        mac,
        latitud: location.latitud,
        longitud: location.longitud
      };

      console.log('Buscando cliente con datos:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }
      
      if (!response.ok) {
        const mensaje = typeof data === 'object' ? data?.mensaje : data;
        throw new Error(mensaje || 'Error al buscar cliente');
      }
      
      return data;
    } catch (error) {
      console.error('Error en buscarCliente:', error);
      throw error;
    }
  }

  /**
   * Busca las cuentas de un cliente
   * @param {Object} params - Parámetros de búsqueda
   * @param {string} params.identificacion - Número de identificación del cliente
   * @param {number} params.secuencialTipoIdentificacion - ID del tipo de identificación
   * @param {number} params.numeroCliente - Número de cliente (opcional)
   * @param {number} params.secuencialEmpresa - ID de la empresa (opcional)
   * @param {string} params.usuario - Nombre de usuario del corresponsal
   * @returns {Promise<Object>} - Datos de las cuentas del cliente
   */
  static async buscarCuentas({ 
    identificacion, 
    secuencialTipoIdentificacion, 
    numeroCliente, 
    secuencialEmpresa, 
    usuario
  }) {
    const url = `${BASE_URL}/Cuenta/buscarCuentas`;
    try {
      const isConnected = await NetworkService.checkConnection();
      const token = await this.getAuthToken();
      
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }
      
      const location = await LocationService.getLocation();
      const body = {
        identificacion: identificacion || null,
        secuencialTipoIdentificacion: secuencialTipoIdentificacion || null,
        numeroCliente: numeroCliente || null,
        secuencialEmpresa: secuencialEmpresa || null,
        usuario: usuario || null,
        imei,
        mac,
        latitud: location.latitud,
        longitud: location.longitud
      };

      // Eliminar propiedades nulas o indefinidas
      Object.keys(body).forEach(key => {
        if (body[key] === null || body[key] === undefined) {
          delete body[key];
        }
      });

      console.log('Buscando cuentas con datos:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.mensaje || 'Error desconocido al buscar cuentas';
        throw new Error(errorMessage);
      }

      // Validar que la respuesta tenga el formato esperado
      if (!data || typeof data !== 'object') {
        throw new Error('Formato de respuesta inválido');
      }
      
      // Asegurar que siempre devolvamos un objeto con el array de cuentas
      return {
        cuentaDetallesConsolidado: data.cuentaDetallesConsolidado || [],
        ...data // Incluir cualquier otro dato que venga en la respuesta
      };
    } catch (error) {
      console.error('Error en buscarCuentas:', error);
      throw error;
    }
  }

  static async cambiarContrasena({ token, contrasenia }) {
    const url = `${BASE_URL}/Usuario/CambioContrasenia`;
    
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }
      
      const body = {
        token,
        contrasenia
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al cambiar la contraseña: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en cambiarContrasena:', error);
      throw error;
    }
  }

  static async procesarRetiro({
    secuencialCuenta,
    numeroCuentaCliente,
    tipoCuentaCliente,
    valor,
    nombreCliente,
    identificacionCliente,
    tipoIdentificacionCliente,
    descripcion,
    usuario,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  }) {
    const url = `${BASE_URL}/Transaccion/procesarRetiro`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      // Obtener ubicación actual
      const location = await LocationService.getLocation();
      
      const body = {
        secuencialCuenta,
        numeroCuentaCliente: numeroCuentaCliente || null,
        tipoCuentaCliente: tipoCuentaCliente || null,
        valor,
        nombreCliente: nombreCliente || null,
        identificacionCliente: identificacionCliente || null,
        tipoIdentificacionCliente,
        descripcion: descripcion || null,
        usuario: usuario || null,
        imei: customImei || imei,
        latitud: customLatitud || location.latitud,
        longitud: customLongitud || location.longitud,
        mac: customMac || mac
      };

      console.log('Solicitando procesamiento de retiro a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al procesar el retiro (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error en procesarRetiro:', error);
      throw error;
    }
  }

  static async procesarDeposito({
    secuencialCuenta,
    numeroCuentaCliente,
    tipoCuentaCliente,
    valor,
    nombreCliente,
    identificacionCliente,
    tipoIdentificacionCliente,
    descripcion,
    usuario,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  }) {
    const url = `${BASE_URL}/Transaccion/procesarDeposito`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      // Obtener ubicación actual
      const location = await LocationService.getLocation();
      
      const body = {
        secuencialCuenta,
        numeroCuentaCliente: numeroCuentaCliente || null,
        tipoCuentaCliente: tipoCuentaCliente || null,
        valor,
        nombreCliente: nombreCliente || null,
        identificacionCliente: identificacionCliente || null,
        tipoIdentificacionCliente,
        descripcion: descripcion || null,
        usuario: usuario || null,
        imei: customImei || imei,
        latitud: customLatitud || location.latitud,
        longitud: customLongitud || location.longitud,
        mac: customMac || mac
      };

      console.log('Solicitando procesamiento de depósito a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al procesar el depósito (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error en procesarDeposito:', error);
      throw error;
    }
  }

  static async listarTiposTransacciones({
    usuario,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  } = {}) {
    const url = `${BASE_URL}/Transaccion/listaTipoTransaccion`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      // Obtener ubicación actual si no se proporciona
      const location = await LocationService.getLocation();
      
      const body = {
        usuario: usuario || null,
        imei: customImei || imei,
        latitud: customLatitud !== undefined ? customLatitud : location.latitud,
        longitud: customLongitud !== undefined ? customLongitud : location.longitud,
        mac: customMac || mac
      };

      console.log('Solicitando tipos de transacciones a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al obtener tipos de transacciones (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      const result = responseText ? JSON.parse(responseText) : {};
      
      // Asegurarse de que siempre devolvamos un array en tiposTransacciones
      if (result && !result.tiposTransacciones) {
        result.tiposTransacciones = [];
      }
      
      return result;
    } catch (error) {
      console.error('Error en listarTiposTransacciones:', error);
      throw error;
    }
  }

  /**
   * Solicita el saldo de una cuenta
   * @param {Object} params - Parámetros de la solicitud
   * @param {string} [params.usuario] - Nombre de usuario del corresponsal
   * @param {string} [params.imei] - IMEI del dispositivo (opcional)
   * @param {number} [params.latitud] - Latitud de la ubicación (opcional)
   * @param {number} [params.longitud] - Longitud de la ubicación (opcional)
   * @param {string} [params.mac] - Dirección MAC del dispositivo (opcional)
   * @returns {Promise<number>} - Saldo de la cuenta
   */
 
  static async solicitudSaldoCuenta({
    usuario    
  } = {}) {
    const url = `${BASE_URL}/Cuenta/solicitudSaldoCuenta`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();
      
      const body = {
        usuario: usuario,
        imei,
        latitud: location.latitud,
        longitud: location.longitud,
        mac
      };

      console.log('Solicitando saldo de cuenta a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al obtener el saldo de la cuenta (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // La respuesta debe ser un número (el saldo)
      const saldo = responseText ? parseFloat(responseText) : 0;
      
      return saldo;
    } catch (error) {
      console.error('Error en solicitudSaldoCuenta:', error);
      throw error;
    }
  }

  /**
   * Solicita el envío de un código OTP al usuario o corresponsal
   * @param {Object} params - Parámetros de la solicitud
   * @param {string} [params.usuario] - Nombre de usuario (opcional si se proporciona identificación)
   * @param {string} [params.identificacion] - Identificación del usuario (opcional si se proporciona usuario)
   * @param {number} params.secuencialTipoIdentificacion - ID del tipo de identificación
   * @param {boolean} params.paraAgente - Indica si el OTP es para el agente (true) o para el cliente (false)
   * @param {string} [params.imei] - IMEI del dispositivo (opcional)
   * @param {number} [params.latitud] - Latitud de la ubicación (opcional)
   * @param {number} [params.longitud] - Longitud de la ubicación (opcional)
   * @param {string} [params.mac] - Dirección MAC del dispositivo (opcional)
   * @returns {Promise<Object>} - Objeto con el resultado de la solicitud
   *   @property {boolean} otpGenerado - Indica si se generó el OTP correctamente
   *   @property {boolean} notificationEmailError - Indica si hubo error en el envío por correo
   *   @property {string} notificationEmailErrorMensaje - Mensaje de error del correo
   *   @property {boolean} notificationSMSError - Indica si hubo error en el envío por SMS
   *   @property {string} notificationSMSErrorMensaje - Mensaje de error del SMS
   */
  static async solicitarOtp({
    usuario = null,
    identificacion = null,
    secuencialTipoIdentificacion,
    paraAgente  } = {}) {
    const url = `${BASE_URL}/Usuario/solicitudOtp`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      if (!usuario && !identificacion) {
        throw new Error('Se requiere usuario o identificación');
      }

      if (secuencialTipoIdentificacion === undefined) {
        throw new Error('El secuencial de tipo de identificación es requerido');
      }

      if (paraAgente === undefined) {
        throw new Error('El parámetro paraAgente es requerido');
      }

      const location = await LocationService.getLocation();
      
      const body = {
        usuario,
        identificacion,
        secuencialTipoIdentificacion,
        paraAgente,
        imei: imei,
        latitud: location.latitud,
        longitud: location.longitud,
        mac: mac
      };

      console.log('Solicitando OTP en:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        const errorMessage = responseData?.message || `Error al solicitar el OTP (${response.status})`;
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return {
        otpGenerado: responseData.otpGenerado || false,
        notificationEmailError: responseData.notificationEmailError || false,
        notificationEmailErrorMensaje: responseData.notificationEmailErrorMensaje || null,
        notificationSMSError: responseData.notificationSMSError || false,
        notificationSMSErrorMensaje: responseData.notificationSMSErrorMensaje || null
      };
    } catch (error) {
      console.error('Error en solicitarOtp:', error);
      throw error;
    }
  }

  /**
   * Verifica un código OTP para un usuario o corresponsal
   * @param {Object} params - Parámetros de la verificación
   * @param {string} [params.usuario] - Nombre de usuario (opcional si se proporciona identificación)
   * @param {string} [params.identificacion] - Identificación del usuario (opcional si se proporciona usuario)
   * @param {string} params.otp - Código OTP a verificar
   * @param {string} [params.imei] - IMEI del dispositivo (opcional)
   * @param {number} [params.latitud] - Latitud de la ubicación (opcional)
   * @param {number} [params.longitud] - Longitud de la ubicación (opcional)
   * @param {string} [params.mac] - Dirección MAC del dispositivo (opcional)
   * @returns {Promise<Object>} - Resultado de la verificación
   */
  static async verificarOtp({
    usuario = null,
    identificacion = null,
    otp,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  } = {}) {
    const url = `${BASE_URL}/Usuario/verificarOtp`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      if (!usuario && !identificacion) {
        throw new Error('Se requiere usuario o identificación');
      }

      if (!otp) {
        throw new Error('El código OTP es requerido');
      }

      const location = await LocationService.getLocation();
      
      const body = {
        usuario,
        identificacion,
        otp,
        imei: imei,
        latitud: location.latitud,
        longitud: location.longitud,
        mac: mac
      };

      console.log('Verificando OTP en:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al verificar el OTP (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Con 200, el cuerpo puede ser solo true o false (JSON o texto)
      let esValido = false;
      if (responseText != null && String(responseText).trim() !== '') {
        const trimmed = String(responseText).trim();
        try {
          const parsed = JSON.parse(trimmed);
          esValido = parsed === true;
        } catch (e) {
          esValido = trimmed.toLowerCase() === 'true';
        }
      }
      console.log('[verificarOtp] esValido:', esValido);
      if (!esValido) {
        throw new Error('Código OTP incorrecto');
      }

      return { success: true };
    } catch (error) {
      console.error('Error en verificarOtp:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo cliente en el sistema
   * @param {Object} params - Datos del cliente a crear
   * @param {number} [params.secuencialTipoIdentificacion] - ID del tipo de identificación
   * @param {string} [params.identificacion] - Número de identificación
   * @param {string} [params.nombres] - Nombres del cliente
   * @param {string} [params.apellidoPaterno] - Apellido paterno
   * @param {string} [params.apellidoMaterno] - Apellido materno
   * @param {boolean} [params.esMasculino] - true para masculino, false para femenino
   * @param {string} [params.fechaNacimiento] - Fecha de nacimiento (formato ISO 8601)
   * @param {string} [params.telefonoDomicilio] - Teléfono fijo
   * @param {string} [params.telefonoCelular] - Número de celular
   * @param {string} [params.direccionDomiciliaria] - Dirección de domicilio
   * @param {string} [params.referenciaDomiciliaria] - Referencia de domicilio
   * @param {string} [params.codigoPais] - Código de país (ej: 'EC')
   * @param {string} [params.codigoEstadoCivil] - Código de estado civil
   * @param {string} [params.codigoDactilar] - Código dactilar
   * @param {string} [params.mail] - Correo electrónico
   * @param {string} [params.usuario] - Usuario que crea el registro
   * @returns {Promise<boolean>} - true si el cliente se creó correctamente
   */
  /**
   * Busca los tipos de cuenta disponibles para un cliente
   * @param {Object} params - Parámetros de búsqueda
   * @param {number} params.secuencialCliente - ID del cliente
   * @param {number} params.secuencialEmpresa - ID de la empresa
   * @param {string} [params.codigoProductoVista] - Código del producto (opcional)
   * @param {string} [params.usuario] - Usuario que realiza la consulta
   * @returns {Promise<Array>} - Lista de tipos de cuenta disponibles
   */
  static async buscarTipoCuenta({
    secuencialCliente,
    secuencialEmpresa,
    codigoProductoVista,
    usuario
  } = {}) {
    const url = `${BASE_URL}/Cuenta/buscarTipoCuenta`;
    
    try {
      const isConnected = await NetworkService.checkConnection();
      const token = await this.getAuthToken();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();
      const body = {
        secuencialCliente,
        secuencialEmpresa,
        codigoProductoVista,
        usuario,
        imei,
        latitud: location.latitud,
        longitud: location.longitud,
        mac,
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error as JSON, use the default error message
        }
        throw new Error(errorMessage);
      }

      const result = responseText ? JSON.parse(responseText) : {};
      return result.tiposCuenta || [];
    } catch (error) {
      console.error('Error en buscarTipoCuenta:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva cuenta para un cliente
   * @param {Object} params - Parámetros para la creación de la cuenta
   * @param {string} params.codigoTipoCuenta - Código del tipo de cuenta a crear
   * @param {number} params.secuencialCliente - ID del cliente
   * @param {string} [params.usuario] - Usuario que realiza la operación
   * @param {string} [params.imei] - IMEI del dispositivo (opcional)
   * @param {number} [params.latitud] - Latitud de la ubicación (opcional)
   * @param {number} [params.longitud] - Longitud de la ubicación (opcional)
   * @param {string} [params.mac] - Dirección MAC del dispositivo (opcional)
   * @returns {Promise<Object>} - Respuesta con las cuentas creadas
   */
  static async crearCuenta({
    codigoTipoCuenta,
    secuencialCliente,
    usuario  
  } = {}) {
    const url = `${BASE_URL}/Cuenta/crearCuenta`;
    
    try {
      const isConnected = await NetworkService.checkConnection();
      const token = await this.getAuthToken();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();
      const body = {
        codigoTipoCuenta,
        secuencialCliente,
        usuario,
        imei,
        latitud: location.latitud,
        longitud: location.longitud,
        mac,
      };

      console.log('body:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      console.log('response:', response);

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Si no podemos parsear el error como JSON, usamos el mensaje de error por defecto
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error en crearCuenta:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo cliente en el sistema
   * @param {Object} params - Datos del cliente a crear (CrearClienteME)
   * @returns {Promise<boolean>} - true si la creación fue exitosa, false en caso contrario
   */
  static async crearCliente(params = {}) {
    const url = `${BASE_URL}/Cliente/crearCliente`;
    
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const token = await this.getAuthToken();
      const location = await LocationService.getLocation();
      
      // Formatear fechaNacimiento si está presente
      let fechaNacimientoFormatted = null;
      if (params.fechaNacimiento) {
        if (params.fechaNacimiento instanceof Date) {
          fechaNacimientoFormatted = params.fechaNacimiento.toISOString();
        } else if (typeof params.fechaNacimiento === 'string') {
          // Si ya es string, verificar si es ISO o necesita conversión
          try {
            const date = new Date(params.fechaNacimiento);
            if (!isNaN(date.getTime())) {
              fechaNacimientoFormatted = date.toISOString();
            } else {
              fechaNacimientoFormatted = params.fechaNacimiento;
            }
          } catch (e) {
            fechaNacimientoFormatted = params.fechaNacimiento;
          }
        } else {
          fechaNacimientoFormatted = params.fechaNacimiento;
        }
      }
      
      const requestData = {
        secuencialTipoIdentificacion: params.secuencialTipoIdentificacion !== undefined ? params.secuencialTipoIdentificacion : null,
        identificacion: params.identificacion || null,
        nombres: params.nombres || null,
        apellidoPaterno: params.apellidoPaterno || null,
        apellidoMaterno: params.apellidoMaterno || null,
        esMasculino: params.esMasculino !== undefined ? params.esMasculino : null,
        fechaNacimiento: fechaNacimientoFormatted,
        telefonoDomicilio: params.telefonoDomicilio || null,
        telefonoCelular: params.telefonoCelular || null,
        direccionDomiciliaria: params.direccionDomiciliaria || null,
        referenciaDomiciliaria: params.referenciaDomiciliaria || null,
        codigoPais: params.codigoPais || null,
        codigoEstadoCivil: params.codigoEstadoCivil || null,
        codigoDactilar: params.codigoDactilar || null,
        mail: params.mail || null,
        usuario: params.usuario || null,
        imei: params.imei || imei || null,
        latitud: params.latitud !== undefined ? params.latitud : location.latitud,
        longitud: params.longitud !== undefined ? params.longitud : location.longitud,
        mac: params.mac || mac || null
      };

      console.log('Solicitando creación de cliente:', url);
      console.log('Datos del cliente:', JSON.stringify(requestData, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(requestData),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Error al crear el cliente';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }

      // La API devuelve boolean (OpenAPI): true = éxito, false = error
      const result = responseText ? JSON.parse(responseText) : false;
      return result === true;
    } catch (error) {
      console.error('Error en crearCliente:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de transacciones según los filtros especificados
   * @param {Object} params - Parámetros de búsqueda
   * @param {Date} params.fechaInicio - Fecha de inicio del rango de búsqueda
   * @param {Date} params.fechaFin - Fecha de fin del rango de búsqueda
   * @param {string} params.usuario - Usuario que realiza la consulta
   * @returns {Promise<Object>} - Lista de transacciones que coinciden con los filtros
   */
  static async obtenerTransacciones({ fechaInicio, fechaFin, usuario }) {
    const url = `${BASE_URL}/Historial/obtenerTransacciones`;
    
    try {
      const isConnected = await NetworkService.checkConnection();
      const token = await this.getAuthToken();
      
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }
      
      const location = await LocationService.getLocation();
      
      // Formatear fechas a ISO string
      const fechaInicioISO = fechaInicio.toISOString();
      const fechaFinISO = fechaFin.toISOString();
     
      const body = {
        fechaInicio: fechaInicioISO,
        fechaFin: fechaFinISO,
        usuario: usuario || null,
        imei: imei,
        mac: mac,
        latitud: location.latitud,
        longitud: location.longitud
      };
      
      console.log('Solicitando historial de transacciones a:', url);
      console.log('Parámetros de búsqueda:', JSON.stringify(body, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener el historial de transacciones');
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Error en obtenerTransacciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de tipos de transacciones disponibles
   * @param {Object} params - Parámetros para la solicitud
   * @param {string} [params.usuario] - Nombre de usuario
   * @returns {Promise<Object>} - Objeto con la lista de tipos de transacciones y saldo de caja
   */
  static async obtenerTiposTransacciones({ usuario }) {
    const url = `${BASE_URL}/Transaccion/listaTipoTransaccion`;
    try {
      const isConnected = await NetworkService.checkConnection();
      const token = await this.getAuthToken();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }
      
      const location = await LocationService.getLocation();
      const body = {
        usuario: usuario || null,
        imei,
        mac,
        latitud: location.latitud,
        longitud: location.longitud
      };
      
      console.log('Solicitando tipos de transacciones a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener tipos de transacciones');
      }

      const data = await response.json();
      console.log('Tipos de transacciones recibidos:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Error en obtenerTiposTransacciones:', error);
      throw error;
    }
  }  

  /**
   * Obtiene las transacciones para la hoja de colecta
   * @param {Object} params - Parámetros para la solicitud
   * @param {string} [params.usuario] - Nombre de usuario
   * @returns {Promise<Object>} - Objeto con la lista de transacciones de la hoja de colecta
   */
  static async obtenerTransaccionesHojaColecta({ usuario }) {
    const url = `${BASE_URL}/HojaColecta/obtenerTransacciones`;
    try {
      const isConnected = await NetworkService.checkConnection();
      const token = await this.getAuthToken();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();
      const body = {
        usuario: usuario || null,
        imei,
        mac,
        latitud: location.latitud,
        longitud: location.longitud
      };

      console.log('Solicitando transacciones de hoja de colecta a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error en obtenerTransaccionesHojaColecta:', error);
      throw error;
    }
  }

  /**
   * Procesa un pago de servicio
   * @param {Object} params - Parámetros para el pago
   * @param {number} [params.comision] - Comisión del pago
   * @param {string} [params.nombreCliente] - Nombre del cliente
   * @param {string} [params.descripcion] - Descripción del pago
   * @param {number} [params.secuencialCuentaCliente] - ID de la cuenta del cliente
   * @param {string} [params.idProducto] - ID del producto
   * @param {string} [params.referencia] - Referencia del pago
   * @param {number} params.valor - Valor del pago
   * @param {string} [params.valorTonelaje] - Valor tonelaje
   * @param {string} [params.identificacion] - Identificación del cliente
   * @param {number} [params.numeroCuotasPensionesAlimenticiaPersona] - Número de cuotas
   * @param {string} [params.codigoPagarPensionesAlimenticiaEmpresa] - Código de empresa
   * @param {number} [params.secuencialResultadoTransaccion] - Secuencial de resultado
   * @param {boolean} [params.comisionRubro] - Si aplica comisión por rubro
   * @param {Array} [params.rubros] - Array de rubros
   * @param {string} [params.usuario] - Usuario que realiza la operación
   * @returns {Promise<Object>} - Respuesta con el resultado del pago
   */
  static async pagarServicio({
    comision,
    nombreCliente,
    descripcion,
    secuencialCuentaCliente,
    idProducto,
    referencia,
    valor,
    valorTonelaje,
    identificacion,
    numeroCuotasPensionesAlimenticiaPersona,
    codigoPagarPensionesAlimenticiaEmpresa,
    secuencialResultadoTransaccion,
    comisionRubro,
    rubros,
    usuario,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  }) {
    const url = `${BASE_URL}/PagoServicios/pagarServicio`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();
      
      const body = {
        comision: comision || 0,
        nombreCliente: nombreCliente || '',
        descripcion: descripcion || null,
        secuencialCuentaCliente: secuencialCuentaCliente || 0,
        idProducto: idProducto || null,
        referencia: referencia || '',
        valor: parseFloat(valor),
        valorTonelaje: valorTonelaje || '',
        identificacion: identificacion || '',
        numeroCuotasPensionesAlimenticiaPersona: numeroCuotasPensionesAlimenticiaPersona || 0,
        codigoPagarPensionesAlimenticiaEmpresa: codigoPagarPensionesAlimenticiaEmpresa || '',
        secuencialResultadoTransaccion: secuencialResultadoTransaccion || 0,
        comisionRubro: comisionRubro || false,
        rubros: rubros || [],
        usuario: usuario || null,
        imei: customImei || imei,
        latitud: customLatitud || location.latitud,
        longitud: customLongitud || location.longitud,
        mac: customMac || mac
      };

      console.log('Solicitando pago de servicio a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al procesar el pago de servicio (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error en pagarServicio:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de servicios disponibles
   * @param {Object} params - Parámetros para la solicitud
   * @param {string} [params.usuario] - Usuario que realiza la consulta
   * @returns {Promise<Object>} - Lista de servicios disponibles
   */
  static async obtenerServicios({
    usuario,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  } = {}) {
    const url = `${BASE_URL}/PagoServicios/obtenerServicios`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();
      
      const body = {
        usuario: usuario || null,
        imei: customImei || imei,
        latitud: customLatitud || location.latitud,
        longitud: customLongitud || location.longitud,
        mac: customMac || mac
      };

      console.log('Solicitando servicios a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al obtener servicios (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error en obtenerServicios:', error);
      throw error;
    }
  }

  /**
   * Obtiene los productos de un servicio
   * @param {Object} params - Parámetros para la solicitud
   * @param {string} params.idGrupo - ID del grupo de servicios
   * @param {string} [params.servicio] - ID del servicio
   * @param {string} [params.usuario] - Usuario que realiza la consulta
   * @returns {Promise<Object>} - Lista de productos del servicio
   */
  static async obtenerProductos({
    idGrupo,
    servicio,
    usuario,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  }) {
    const url = `${BASE_URL}/PagoServicios/obtenerProductos`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();
      
      const body = {
        idGrupo: idGrupo != null && idGrupo !== '' ? String(idGrupo) : null,
        servicio: servicio != null && servicio !== '' ? String(servicio) : null,
        usuario: usuario || null,
        imei: customImei || imei,
        latitud: customLatitud || location.latitud,
        longitud: customLongitud || location.longitud,
        mac: customMac || mac
      };

      console.log('Solicitando productos a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al obtener productos (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error en obtenerProductos:', error);
      throw error;
    }
  }

  /**
   * Obtiene el detalle de consulta para un producto con trxConsulta (ConsultaRequest/ConsultaResponse).
   * @param {Object} params - Parámetros ConsultaRequest
   * @param {string} params.referencia - DatosPagoServicio.referencia
   * @param {string} params.identificacion - Identificación del agente (sesión)
   * @param {string} params.idProducto - producto.idProducto
   * @param {string} [params.codigoPagarPensionesAlimenticiaEmpresa] - DatosPagoServicio.codigoPensionAlimenticia
   * @param {number} [params.numeroCuotasPensionesAlimenticiaPersona] - parseInt(DatosPagoServicio.numeroCuotasPensionAlimenticia) o 0
   * @param {string} [params.valorTonelaje] - DatosPagoServicio.valorTonelaje
   * @param {string} [params.usuario] - Usuario sesión
   * @returns {Promise<Object>} - ConsultaResponse: codigoResultado, mensaje, nombre, cedularuc, valortotal, secuencialResultadoTransaccion, comision, rubros
   */
  static async obtenerDetalleConsulta({
    referencia,
    identificacion,
    idProducto,
    codigoPagarPensionesAlimenticiaEmpresa,
    numeroCuotasPensionesAlimenticiaPersona,
    valorTonelaje,
    usuario,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  }) {
    const url = `${BASE_URL}/PagoServicios/obtenerDetalleConsulta`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();

      const body = {
        referencia: referencia != null && referencia !== '' ? String(referencia) : null,
        identificacion: identificacion != null && identificacion !== '' ? String(identificacion) : null,
        idProducto: idProducto != null && idProducto !== '' ? String(idProducto) : null,
        codigoPagarPensionesAlimenticiaEmpresa: codigoPagarPensionesAlimenticiaEmpresa != null && codigoPagarPensionesAlimenticiaEmpresa !== '' ? String(codigoPagarPensionesAlimenticiaEmpresa) : null,
        numeroCuotasPensionesAlimenticiaPersona: numeroCuotasPensionesAlimenticiaPersona != null && !isNaN(Number(numeroCuotasPensionesAlimenticiaPersona)) ? Number(numeroCuotasPensionesAlimenticiaPersona) : 0,
        valorTonelaje: valorTonelaje != null && valorTonelaje !== '' ? String(valorTonelaje) : null,
        usuario: usuario || null,
        imei: customImei || imei,
        latitud: customLatitud ?? location.latitud,
        longitud: customLongitud ?? location.longitud,
        mac: customMac || mac
      };

      console.log('Solicitando detalle consulta a:', url);
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(body)
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `Error al obtener detalle consulta (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error en obtenerDetalleConsulta:', error);
      throw error;
    }
  }

  /**
   * Consulta un servicio para obtener información de pago
   * @param {Object} params - Parámetros para la consulta
   * @param {string} params.idProducto - ID del producto
   * @param {string} [params.referencia] - Referencia del servicio
   * @param {string} [params.identificacion] - Identificación del cliente
   * @param {string} [params.valorTonelaje] - Valor tonelaje
   * @param {number} params.numeroCuotasPensionesAlimenticiaPersona - Número de cuotas
   * @param {string} [params.codigoPagarPensionesAlimenticiaEmpresa] - Código de empresa
   * @param {string} [params.usuario] - Usuario que realiza la consulta
   * @returns {Promise<Object>} - Información del servicio consultado
   */
  static async consultaServicio({
    idProducto,
    referencia,
    identificacion,
    valorTonelaje,
    numeroCuotasPensionesAlimenticiaPersona,
    codigoPagarPensionesAlimenticiaEmpresa,
    usuario,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  }) {
    const url = `${BASE_URL}/PagoServicios/consultaServicio`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();
      
      const body = {
        idProducto: idProducto || null,
        referencia: referencia || null,
        identificacion: identificacion || '',
        valorTonelaje: valorTonelaje || '',
        numeroCuotasPensionesAlimenticiaPersona: numeroCuotasPensionesAlimenticiaPersona || 0,
        codigoPagarPensionesAlimenticiaEmpresa: codigoPagarPensionesAlimenticiaEmpresa || '',
        usuario: usuario || null,
        imei: customImei || imei,
        latitud: customLatitud || location.latitud,
        longitud: customLongitud || location.longitud,
        mac: customMac || mac
      };

      console.log('Consultando servicio a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al consultar servicio (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error en consultaServicio:', error);
      throw error;
    }
  }

  /**
   * Realiza un reverso de un pago facilito
   * @param {Object} params - Parámetros para el reverso
   * @param {string} [params.documento] - Número de documento
   * @param {number} params.secuencialEnvioPago - Secuencial del envío de pago
   * @param {string} [params.usuario] - Usuario que realiza el reverso
   * @returns {Promise<Object>} - Resultado del reverso
   */
  static async reversoFacilito({
    documento,
    secuencialEnvioPago,
    usuario,
    imei: customImei,
    latitud: customLatitud,
    longitud: customLongitud,
    mac: customMac
  }) {
    const url = `${BASE_URL}/PagoServicios/reversoFacilito`;
    try {
      const isConnected = await NetworkService.checkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet');
      }

      const location = await LocationService.getLocation();
      
      const body = {
        documento: documento || null,
        secuencialEnvioPago: secuencialEnvioPago || null,
        usuario: usuario || null,
        imei: customImei || imei,
        latitud: customLatitud || location.latitud,
        longitud: customLongitud || location.longitud,
        mac: customMac || mac
      };

      console.log('Solicitando reverso facilito a:', url);
      console.log('Datos enviados:', JSON.stringify(body, null, 2));
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `Error al realizar reverso facilito (${response.status})`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.title || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Error en la respuesta:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Error en reversoFacilito:', error);
      throw error;
    }
  }

}

export default ApiService;
