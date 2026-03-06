import { PermissionsAndroid, Platform } from 'react-native';

// Importación condicional de la librería Bluetooth
let BluetoothEscposPrinter = null;
let BluetoothManager = null;
let errorCarga = null;

try {
  const bluetoothModule = require('react-native-bluetooth-escpos-printer');
  console.log('Módulo Bluetooth cargado:', bluetoothModule);
  console.log('Tipo del módulo:', typeof bluetoothModule);
  console.log('Propiedades del módulo:', Object.keys(bluetoothModule || {}));
  
  // La librería puede exportarse de diferentes formas
  const moduleRoot = bluetoothModule.default || bluetoothModule;
  
  // Verificar si el módulo tiene sub-módulos (BluetoothManager, BluetoothEscposPrinter, BluetoothTscPrinter)
  if (moduleRoot && typeof moduleRoot === 'object') {
    // Buscar BluetoothManager - puede estar como propiedad directa o con diferentes nombres
    if (moduleRoot.BluetoothManager) {
      BluetoothManager = moduleRoot.BluetoothManager;
      console.log('✓ BluetoothManager encontrado como propiedad directa');
    } else if (moduleRoot['Bluetooth Manager']) {
      BluetoothManager = moduleRoot['Bluetooth Manager'];
      console.log('✓ BluetoothManager encontrado como "Bluetooth Manager"');
    }
    
    // Buscar BluetoothEscposPrinter
    if (moduleRoot.BluetoothEscposPrinter) {
      BluetoothEscposPrinter = moduleRoot.BluetoothEscposPrinter;
      console.log('✓ BluetoothEscposPrinter encontrado');
    } else if (moduleRoot['Bluetooth Escpos Printer']) {
      BluetoothEscposPrinter = moduleRoot['Bluetooth Escpos Printer'];
      console.log('✓ BluetoothEscposPrinter encontrado como "Bluetooth Escpos Printer"');
    }
    
    // Si no encontramos los sub-módulos, verificar si el módulo raíz tiene métodos directos
    if (!BluetoothManager && typeof moduleRoot.list === 'function') {
      BluetoothManager = moduleRoot;
      console.log('✓ Módulo raíz tiene método list() directo');
    }
    
    if (!BluetoothEscposPrinter && typeof moduleRoot.connect === 'function') {
      BluetoothEscposPrinter = moduleRoot;
      console.log('✓ Módulo raíz tiene método connect() directo');
    }
    
    // Si aún no tenemos BluetoothEscposPrinter, usar el módulo raíz como fallback
    if (!BluetoothEscposPrinter) {
      BluetoothEscposPrinter = moduleRoot;
      console.log('⚠ Usando módulo raíz como fallback para BluetoothEscposPrinter');
    }
    
    // Si aún no tenemos BluetoothManager, intentar usar BluetoothEscposPrinter
    if (!BluetoothManager && BluetoothEscposPrinter) {
      BluetoothManager = BluetoothEscposPrinter;
      console.log('⚠ Usando BluetoothEscposPrinter como fallback para BluetoothManager');
    }
  } else {
    BluetoothEscposPrinter = moduleRoot;
    BluetoothManager = moduleRoot;
  }
  
  // Verificar que al menos BluetoothManager tenga el método list()
  if (!BluetoothManager) {
    console.warn('BluetoothManager no está disponible');
    const metodosDisponibles = Object.keys(bluetoothModule || {}).join(', ');
    errorCarga = `El módulo se cargó pero BluetoothManager no está disponible. Métodos disponibles: ${metodosDisponibles}`;
    BluetoothEscposPrinter = null;
    BluetoothManager = null;
  } else {
    // Verificar si BluetoothManager tiene el método list()
    // Puede ser que BluetoothManager sea un objeto que necesita ser instanciado o que tenga métodos diferentes
    console.log('BluetoothManager tipo:', typeof BluetoothManager);
    console.log('BluetoothManager propiedades:', Object.keys(BluetoothManager || {}));
    
    // Verificar si list() está disponible directamente
    if (typeof BluetoothManager.list === 'function') {
      console.log('✓ BluetoothManager.list() está disponible directamente');
    } else {
      // Buscar métodos alternativos que puedan ser list()
      const managerMethods = Object.keys(BluetoothManager || {});
      console.log('Métodos en BluetoothManager:', managerMethods);
      
      // Buscar métodos que puedan ser list() o scan()
      // La librería react-native-bluetooth-escpos-printer usa scanDevices() que devuelve una Promise
      const listMethod = managerMethods.find(m => {
        const methodLower = m.toLowerCase();
        return methodLower === 'list' || 
               methodLower === 'scan' ||
               methodLower === 'getdevices' ||
               methodLower === 'getdevicelist' ||
               methodLower === 'scandevices' ||
               methodLower === 'scanDevices' ||
               methodLower === 'getpaireddevices' ||
               methodLower === 'getpaired';
      });
      
      if (listMethod) {
        console.log(`✓ Encontrado método similar a list(): ${listMethod}`);
        // Crear un wrapper para usar el método encontrado
        const originalMethod = BluetoothManager[listMethod];
        
        // Verificar que originalMethod existe
        if (!originalMethod) {
          console.error(`El método ${listMethod} no existe en BluetoothManager`);
          const metodosDisponibles = Object.keys(bluetoothModule || {}).join(', ');
          errorCarga = `El método ${listMethod} no existe en BluetoothManager. Métodos disponibles en el módulo raíz: ${metodosDisponibles}. Métodos en BluetoothManager: ${managerMethods.join(', ')}`;
          BluetoothEscposPrinter = null;
          BluetoothManager = null;
        } else if (typeof originalMethod !== 'function') {
          console.error(`El método ${listMethod} no es una función, tipo: ${typeof originalMethod}`);
          const metodosDisponibles = Object.keys(bluetoothModule || {}).join(', ');
          errorCarga = `El método ${listMethod} no es una función (tipo: ${typeof originalMethod}). Métodos disponibles en el módulo raíz: ${metodosDisponibles}. Métodos en BluetoothManager: ${managerMethods.join(', ')}`;
          BluetoothEscposPrinter = null;
          BluetoothManager = null;
        } else {
          // Guardar el nombre del método para usarlo dinámicamente
          const methodName = listMethod;
          
          // Si el método es scanDevices(), puede que devuelva un objeto con paired y found
          if (listMethod.toLowerCase() === 'scandevices' || listMethod.toLowerCase() === 'scanDevices') {
            BluetoothManager.list = async () => {
              try {
                console.log('Dentro del wrapper, methodName:', methodName);
                
                // Verificar que BluetoothManager existe
                if (!BluetoothManager) {
                  throw new Error('BluetoothManager no está disponible');
                }
                
                // Obtener el método directamente de BluetoothManager en tiempo de ejecución
                console.log('Obteniendo método: BluetoothManager[' + methodName + ']');
                const methodToCall = BluetoothManager[methodName];
                console.log('methodToCall:', methodToCall);
                console.log('methodToCall tipo:', typeof methodToCall);
                
                // Verificar que el método existe y es una función
                if (!methodToCall) {
                  console.error('ERROR: methodToCall es undefined o null');
                  throw new Error(`El método ${methodName} no existe en BluetoothManager`);
                }
                
                if (typeof methodToCall !== 'function') {
                  console.error('ERROR: methodToCall no es una función');
                  throw new Error(`El método ${methodName} no es una función (tipo: ${typeof methodToCall})`);
                }
                
                // Llamar al método
                console.log(`Llamando a ${methodName}...`);
                let result;
                try {
                  // Intentar primero con .call()
                  console.log('Intentando con .call()...');
                  result = await methodToCall.call(BluetoothManager);
                  console.log('Éxito con .call(), resultado:', result);
                } catch (callError) {
                  console.warn('Error con .call():', callError.message);
                  console.warn(`Error al llamar ${methodName} con .call(), intentando directamente:`, callError.message);
                  try {
                    // Si falla con .call(), intentar llamarlo directamente
                    console.log('Intentando directamente...');
                    result = await methodToCall();
                    console.log('Éxito directamente, resultado:', result);
                  } catch (directError) {
                    console.error('Error directamente:', directError.message);
                    console.error(`Error al llamar ${methodName} directamente:`, directError);
                    console.error('Stack trace:', directError.stack);
                    throw directError;
                  }
                }
                
                // scanDevices puede devolver un string JSON o un objeto
                if (typeof result === 'string') {
                  try {
                    const parsed = JSON.parse(result);
                    // Combinar paired y found en un solo array
                    const allDevices = [
                      ...(parsed.paired || []),
                      ...(parsed.found || [])
                    ];
                    return allDevices;
                  } catch (parseError) {
                    console.error('Error al parsear resultado de scanDevices:', parseError);
                    // Si no se puede parsear, devolver array vacío
                    return [];
                  }
                } else if (result && typeof result === 'object') {
                  // Si es un objeto, combinar paired y found
                  const allDevices = [
                    ...(result.paired || []),
                    ...(result.found || [])
                  ];
                  return allDevices;
                }
                return result || [];
              } catch (error) {
                console.error('Error en scanDevices:', error);
                console.error('Stack trace:', error.stack);
                throw error;
              }
            };
          } else {
            // Para otros métodos, crear un wrapper que obtenga el método dinámicamente
            BluetoothManager.list = async function() {
              try {
                console.log('Dentro del wrapper (else), methodName:', methodName);
                
                // Verificar que BluetoothManager existe
                if (!BluetoothManager) {
                  throw new Error('BluetoothManager no está disponible');
                }
                
                // Obtener el método directamente de BluetoothManager en tiempo de ejecución
                console.log('Obteniendo método: BluetoothManager[' + methodName + ']');
                const methodToCall = BluetoothManager[methodName];
                console.log('methodToCall:', methodToCall);
                console.log('methodToCall tipo:', typeof methodToCall);
                
                // Verificar que el método existe y es una función
                if (!methodToCall) {
                  console.error('ERROR: methodToCall es undefined o null');
                  throw new Error(`El método ${methodName} no existe en BluetoothManager`);
                }
                
                if (typeof methodToCall !== 'function') {
                  console.error('ERROR: methodToCall no es una función');
                  throw new Error(`El método ${methodName} no es una función (tipo: ${typeof methodToCall})`);
                }
                
                // Llamar al método con el contexto correcto
                console.log(`Llamando a ${methodName}...`);
                let result;
                try {
                  // Intentar primero con .call()
                  console.log('Intentando con .call()...');
                  result = await methodToCall.call(BluetoothManager);
                  console.log('Éxito con .call(), resultado tipo:', typeof result);
                } catch (callError) {
                  console.warn('Error con .call():', callError.message);
                  console.warn(`Error al llamar ${methodName} con .call(), intentando directamente:`, callError.message);
                  try {
                    // Si falla con .call(), intentar llamarlo directamente
                    console.log('Intentando directamente...');
                    result = await methodToCall();
                    console.log('Éxito directamente, resultado tipo:', typeof result);
                  } catch (directError) {
                    console.error('Error directamente:', directError.message);
                    console.error(`Error al llamar ${methodName} directamente:`, directError);
                    console.error('Stack trace:', directError.stack);
                    throw directError;
                  }
                }
                
                // Procesar el resultado: puede ser un string JSON o un objeto con paired/found
                if (typeof result === 'string') {
                  try {
                    console.log('Resultado es string, parseando JSON...');
                    const parsed = JSON.parse(result);
                    console.log('JSON parseado:', parsed);
                    // Combinar paired y found en un solo array
                    const allDevices = [
                      ...(parsed.paired || []),
                      ...(parsed.found || [])
                    ];
                    console.log('Dispositivos combinados:', allDevices);
                    return allDevices;
                  } catch (parseError) {
                    console.error('Error al parsear resultado:', parseError);
                    // Si no se puede parsear, intentar devolver como array si es posible
                    if (result.trim().startsWith('[')) {
                      try {
                        return JSON.parse(result);
                      } catch (e) {
                        console.error('No se pudo parsear como array:', e);
                        return [];
                      }
                    }
                    return [];
                  }
                } else if (result && typeof result === 'object') {
                  console.log('Resultado es objeto, procesando...');
                  // Si es un objeto, verificar si tiene paired o found
                  if (result.paired || result.found) {
                    // Combinar paired y found en un solo array
                    const allDevices = [
                      ...(result.paired || []),
                      ...(result.found || [])
                    ];
                    console.log('Dispositivos combinados:', allDevices);
                    return allDevices;
                  }
                  // Si es un array, devolverlo directamente
                  if (Array.isArray(result)) {
                    console.log('Resultado es array, devolviendo directamente');
                    return result;
                  }
                  // Si es un objeto pero no tiene paired/found, intentar convertirlo a array
                  if (result.length !== undefined) {
                    console.log('Resultado tiene length, convirtiendo a array');
                    return Array.from(result);
                  }
                  // Si no se puede procesar, devolver array vacío
                  console.warn('No se pudo procesar el resultado, devolviendo array vacío');
                  return [];
                }
                
                // Si no es string ni objeto, devolver array vacío
                console.warn('Resultado no es string ni objeto, devolviendo array vacío');
                return [];
              } catch (error) {
                console.error(`Error al llamar ${methodName}:`, error);
                console.error('Stack trace:', error.stack);
                throw error;
              }
            };
          }
        }
      } else {
        // Si no encontramos el método, mostrar error con información detallada
        const metodosDisponibles = Object.keys(bluetoothModule || {}).join(', ');
        errorCarga = `El módulo no tiene el método list(). Métodos disponibles en el módulo raíz: ${metodosDisponibles}. Métodos en BluetoothManager: ${managerMethods.join(', ')}`;
        BluetoothEscposPrinter = null;
        BluetoothManager = null;
      }
    }
    
    // Si llegamos aquí y BluetoothManager es válido, la carga fue exitosa
    if (BluetoothManager && typeof BluetoothManager.list === 'function') {
      console.log('✓ Librería Bluetooth cargada correctamente');
      console.log('Métodos de BluetoothManager:', Object.keys(BluetoothManager || {}));
      if (BluetoothEscposPrinter) {
        console.log('Métodos de BluetoothEscposPrinter:', Object.keys(BluetoothEscposPrinter || {}));
      }
    }
  }
} catch (error) {
  console.error('Error al cargar react-native-bluetooth-escpos-printer:', error);
  console.error('Stack trace:', error.stack);
  errorCarga = error.message || String(error);
  BluetoothEscposPrinter = null;
  BluetoothManager = null;
}

/**
 * Servicio para manejar la impresión de comprobantes a través de impresoras Bluetooth
 * Específicamente diseñado para la impresora térmica ADV7011
 * 
 * Características de la ADV7011:
 * - Tecnología: Térmica
 * - Velocidad: 90mm/s
 * - Conectividad: Bluetooth/USB
 * - Ancho de papel: 58mm (estándar para recibos)
 * 
 * NOTA: Este servicio requiere la instalación de una librería de impresión Bluetooth.
 * Librería recomendada: react-native-bluetooth-escpos-printer
 * 
 * Instalación:
 * npm install react-native-bluetooth-escpos-printer
 * 
 * Para usar con Expo, se necesita crear un módulo de desarrollo personalizado.
 */
class PrintService {
  // Configuración específica para ADV7011
  static PRINTER_CONFIG = {
    width: 48, // Ancho de caracteres (58mm papel = ~48 caracteres)
    encoding: 'UTF-8',
    speed: 90, // mm/s
  };

  /** Datos estáticos del comprobante (institución, RUC, atención al socio) */
  static COMPROBANTE_DATOS_ESTATICOS = {
    nombreEmpresa: 'COOPAC LOS ANDES DE COTARUSI',
    ruc: '20526918429',    
    atencionAlSocio: '+51945347147',
  };

  // Almacenar el dispositivo conectado
  static dispositivoConectado = null;
  /**
   * Busca dispositivos Bluetooth disponibles
   * @returns {Promise<Array>} Lista de todos los dispositivos Bluetooth disponibles (sin filtrar)
   */
  static async buscarDispositivosBluetooth() {
    try {
      console.log('Buscando dispositivos Bluetooth...');
      
      if (Platform.OS !== 'android') {
        throw new Error('La impresión Bluetooth solo está disponible en Android');
      }

      if (!BluetoothManager) {
        throw new Error('La librería de impresión Bluetooth no está disponible. Por favor, reconstruya la aplicación.');
      }

      // Verificar que list() esté disponible y sea una función antes de llamarlo
      if (!BluetoothManager.list) {
        throw new Error('El método list() no está disponible en BluetoothManager. Por favor, verifique que la librería esté correctamente instalada.');
      }

      if (typeof BluetoothManager.list !== 'function') {
        console.error('BluetoothManager.list no es una función:', typeof BluetoothManager.list);
        console.error('BluetoothManager:', BluetoothManager);
        console.error('Propiedades de BluetoothManager:', Object.keys(BluetoothManager || {}));
        throw new Error(`El método list() no es una función (tipo: ${typeof BluetoothManager.list}). Por favor, verifique que la librería esté correctamente instalada.`);
      }

      // Buscar dispositivos Bluetooth emparejados usando BluetoothManager
      console.log('Llamando a BluetoothManager.list()...');
      console.log('BluetoothManager.list tipo:', typeof BluetoothManager.list);
      
      let dispositivos;
      try {
        dispositivos = await BluetoothManager.list();
        console.log('Dispositivos encontrados:', dispositivos);
        console.log('Tipo de dispositivos:', typeof dispositivos);
        console.log('¿Es array?:', Array.isArray(dispositivos));
      } catch (listError) {
        console.error('Error al llamar BluetoothManager.list():', listError);
        console.error('Stack trace:', listError.stack);
        throw listError;
      }
      
      // Retornar todos los dispositivos sin filtrar, asegurándose de que sea un array
      if (!dispositivos) {
        console.warn('BluetoothManager.list() devolvió null o undefined');
        return [];
      }
      
      if (!Array.isArray(dispositivos)) {
        console.warn('Los dispositivos no son un array, tipo:', typeof dispositivos);
        console.warn('Contenido:', dispositivos);
        // Intentar convertir a array si es posible
        if (typeof dispositivos === 'object' && dispositivos !== null) {
          // Si es un objeto con propiedades, intentar extraer un array
          if (dispositivos.paired && Array.isArray(dispositivos.paired)) {
            return dispositivos.paired;
          }
          if (dispositivos.found && Array.isArray(dispositivos.found)) {
            return dispositivos.found;
          }
          // Si tiene propiedades numéricas, podría ser un array-like
          if (dispositivos.length !== undefined) {
            return Array.from(dispositivos);
          }
        }
        return [];
      }
      
      return dispositivos;
    } catch (error) {
      console.error('Error al buscar dispositivos Bluetooth:', error);
      console.error('Stack trace:', error.stack);
      throw new Error(`No se pudo buscar dispositivos Bluetooth: ${error.message}`);
    }
  }

  /**
   * Conecta a una impresora Bluetooth
   * @param {string} deviceId - ID del dispositivo Bluetooth
   * @returns {Promise<boolean>} true si la conexión fue exitosa
   */
  static async conectarImpresora(deviceId) {
    try {
      console.log('Conectando a impresora:', deviceId);
      
      if (Platform.OS !== 'android') {
        throw new Error('La impresión Bluetooth solo está disponible en Android');
      }

      if (!BluetoothEscposPrinter) {
        throw new Error('La librería de impresión Bluetooth no está disponible. Por favor, reconstruya la aplicación.');
      }

      // Desconectar si hay una conexión previa
      if (this.dispositivoConectado) {
        await this.desconectarImpresora();
      }

      // Resolver el método connect: en algunas versiones está en BluetoothEscposPrinter, en otras en BluetoothManager
      const connectFn = (typeof BluetoothEscposPrinter?.connect === 'function' && BluetoothEscposPrinter.connect)
        ? BluetoothEscposPrinter.connect.bind(BluetoothEscposPrinter)
        : (typeof BluetoothManager?.connect === 'function' && BluetoothManager.connect)
          ? BluetoothManager.connect.bind(BluetoothManager)
          : null;

      if (!connectFn) {
        const escposMethods = Object.keys(BluetoothEscposPrinter || {}).join(', ') || 'ninguno';
        const managerMethods = Object.keys(BluetoothManager || {}).join(', ') || 'ninguno';
        const detail = {
          mensaje: `No se encontró el método connect(). BluetoothEscposPrinter: [${escposMethods}]. BluetoothManager: [${managerMethods}].`,
          deviceId,
          message: 'undefined is not a function',
          code: 'CONNECT_NOT_FOUND',
          nativeErrorMessage: null,
          stack: null,
          escposMethods,
          managerMethods,
        };
        console.error('Método connect no disponible. BluetoothEscposPrinter:', escposMethods, 'BluetoothManager:', managerMethods);
        const err = new Error(detail.mensaje);
        err.detalleConexion = detail;
        this.dispositivoConectado = null;
        throw err;
      }

      // Conectar al dispositivo (intentar dirección normalizada si la primera falla)
      let lastError = null;
      const direccionesAProbar = [deviceId];
      const normalizada = PrintService._normalizarDireccionMac(deviceId);
      if (normalizada && normalizada !== deviceId) {
        direccionesAProbar.push(normalizada);
      }

      for (const direccion of direccionesAProbar) {
        try {
          await connectFn(direccion);
          lastError = null;
          if (direccion !== deviceId) {
            console.log('Conexión exitosa con dirección normalizada:', direccion);
          }
          break;
        } catch (connectError) {
          lastError = connectError;
          const msg = connectError?.message ?? String(connectError);
          const code = connectError?.code;
          const isRetryable = code === 'EUNSPECIFIED' || /Unable to connect|Unable to conect/i.test(msg);
          if (direccion === deviceId && direccionesAProbar.length > 1 && isRetryable) {
            console.warn('Primera conexión falló, intentando con dirección normalizada...');
            continue;
          }
          break;
        }
      }

      if (lastError) {
        const detail = PrintService._serializarErrorConexion(lastError, deviceId);
        console.error('Error nativo al conectar a la impresora:', detail);
        this.dispositivoConectado = null;
        const err = new Error(detail.mensaje);
        err.detalleConexion = detail;
        throw err;
      }
      
      this.dispositivoConectado = deviceId;
      console.log('Conectado exitosamente a la impresora:', deviceId);
      
      return true;
    } catch (error) {
      if (error.detalleConexion) {
        console.error('Error al conectar a la impresora (detalle):', error.detalleConexion);
        this.dispositivoConectado = null;
        throw error;
      }
      console.error('Error al conectar a la impresora:', error);
      this.dispositivoConectado = null;
      const detail = PrintService._serializarErrorConexion(error, deviceId);
      const err = new Error(detail.mensaje);
      err.detalleConexion = detail;
      throw err;
    }
  }

  /**
   * Serializa un error de conexión para mostrar diagnóstico completo en logs.
   * Añade sugerencias cuando el error es EUNSPECIFIED / "Unable to connect device".
   * @private
   */
  static _serializarErrorConexion(error, deviceId) {
    const msg = error?.message ?? String(error);
    const code = error?.code;
    const partes = [];
    partes.push(`Mensaje: ${msg}`);
    if (code !== undefined && code !== null) {
      partes.push(`Código: ${code}`);
    }
    if (error?.nativeErrorMessage) {
      partes.push(`Nativo (Android): ${error.nativeErrorMessage}`);
    }
    if (error?.userInfo?.message) {
      partes.push(`userInfo.message: ${error.userInfo.message}`);
    }
    if (error?.stack) {
      partes.push(`Stack: ${error.stack}`);
    }

    const isUnableToConnect = code === 'EUNSPECIFIED' || /Unable to connect|Unable to conect/i.test(msg);
    let sugerencias = null;
    if (isUnableToConnect) {
      sugerencias = [
        'Verifique que la impresora esté encendida y cerca del dispositivo.',
        'En Ajustes > Bluetooth, confirme que la impresora aparece como emparejada.',
        'Si aparece "Emparejado" pero no "Conectado", toque la impresora para conectar primero.',
        'Pruebe olvidar el dispositivo en Bluetooth y emparejarlo de nuevo.',
        'Algunas impresoras requieren estar en modo "visible" o "disponible" al emparejar.',
        '— Si usa un emulador (ej. Bluetooth Printer Simulator): abra la app emuladora y póngala en modo "Servidor", "Esperando conexión" o "Listen" antes de tocar Conectar aquí.',
        '— Las apps que emulan impresora a veces usan un perfil Bluetooth distinto al SPP; esta app usa perfil SPP. Si solo prueba con emulador, pruebe con una impresora física para descartar.',
      ];
      partes.push('Sugerencias:', ...sugerencias);
    }

    const mensaje = `No se pudo conectar a la impresora.\n${partes.join('\n')}`;
    return {
      mensaje,
      deviceId,
      message: msg,
      code,
      nativeErrorMessage: error?.nativeErrorMessage,
      stack: error?.stack,
      sugerencias,
    };
  }

  /**
   * Normaliza una dirección Bluetooth a formato con dos puntos (XX:XX:XX:XX:XX:XX).
   * Si ya tiene dos puntos o no son 12 caracteres hex, devuelve el valor sin cambios.
   * @private
   */
  static _normalizarDireccionMac(address) {
    if (!address || typeof address !== 'string') return address;
    const limpio = address.replace(/[:-]/g, '').toUpperCase();
    if (/^[0-9A-F]{12}$/.test(limpio)) {
      return [limpio.slice(0, 2), limpio.slice(2, 4), limpio.slice(4, 6), limpio.slice(6, 8), limpio.slice(8, 10), limpio.slice(10, 12)].join(':');
    }
    return address;
  }

  /**
   * Desconecta la impresora Bluetooth actual
   * @returns {Promise<boolean>} true si la desconexión fue exitosa
   */
  static async desconectarImpresora() {
    try {
      if (!this.dispositivoConectado) {
        return true;
      }

      const disconnectFn = (typeof BluetoothEscposPrinter?.disconnect === 'function' && BluetoothEscposPrinter.disconnect)
        ? BluetoothEscposPrinter.disconnect.bind(BluetoothEscposPrinter)
        : (typeof BluetoothManager?.disconnect === 'function' && BluetoothManager.disconnect)
          ? BluetoothManager.disconnect.bind(BluetoothManager)
          : null;

      if (!disconnectFn) {
        console.warn('Método disconnect no disponible, limpiando estado.');
        this.dispositivoConectado = null;
        return true;
      }

      console.log('Desconectando impresora...');
      await disconnectFn();
      this.dispositivoConectado = null;
      console.log('Desconectado exitosamente');
      return true;
    } catch (error) {
      console.error('Error al desconectar la impresora:', error);
      this.dispositivoConectado = null;
      return false;
    }
  }

  /**
   * Verifica si hay una impresora conectada
   * @returns {boolean} true si hay una impresora conectada
   */
  static estaConectado() {
    return this.dispositivoConectado !== null;
  }

  /**
   * Imprime un comprobante de transacción
   * @param {Object} comprobante - Datos del comprobante a imprimir
   * @param {string} comprobante.fecha - Fecha de la transacción
   * @param {string} comprobante.referencia - Número de comprobante
   * @param {number} comprobante.monto - Monto de la transacción
   * @param {number} comprobante.comision - Comisión
   * @param {number} comprobante.total - Total
   * @param {string} [comprobante.tipo] - Tipo de transacción (opcional)
   * @param {string} [comprobante.cliente] - Nombre del cliente (opcional)
   * @param {string} [comprobante.deviceId] - ID del dispositivo Bluetooth a usar (opcional, si no se proporciona se intentará seleccionar automáticamente)
   * @returns {Promise<boolean>} true si la impresión fue exitosa
   * @throws {Error} Si hay múltiples dispositivos y no se proporciona deviceId, el error incluirá la lista de dispositivos en error.dispositivos
   */
  static async imprimirComprobante(comprobante) {
    try {
      const datos = {
        fecha: comprobante.fecha,
        referencia: comprobante.referencia,
        monto: comprobante.monto,
        comision: comprobante.comision ?? 0,
        total: comprobante.total,
        tipo: comprobante.tipo || 'Transacción',
        cliente: comprobante.cliente || '',
        nombreInstitucion: comprobante.nombreInstitucion || '',
        ruc: comprobante.ruc || '',
        numeroCuenta: comprobante.numeroCuenta || '',
        codigoOperacion: comprobante.codigoOperacion || comprobante.referencia,
        observacion: comprobante.observacion || '',
        negocio: comprobante.negocio || '',
        usuario: comprobante.usuario || '',
        identificacionCliente: comprobante.identificacionCliente || '',
        atencionAlSocio: comprobante.atencionAlSocio || ''
      };

      // Generar comandos ESC/POS para la impresora ADV7011
      const comandos = this.generarComandosESCPOS(datos);

      // Formatear también para visualización (texto plano)
      const contenido = this.formatearComprobante(datos);

      console.log('Comprobante formateado para ADV7011:', contenido);
      console.log('Comandos ESC/POS generados:', comandos.length, 'comandos');

      // Verificar si hay una impresora conectada
      if (!this.dispositivoConectado) {
        // Si se proporciona un deviceId específico, usarlo
        if (comprobante.deviceId) {
          try {
            await this.conectarImpresora(comprobante.deviceId);
          } catch (error) {
            throw new Error(
              `No se pudo conectar al dispositivo especificado.\n\n` +
              `Error: ${error.message}\n\n` +
              'Por favor, verifique que el dispositivo esté encendido y emparejado.'
            );
          }
        } else {
          // Pequeña pausa para no invocar el módulo nativo Bluetooth en el mismo ciclo que el toque (evita cierres en algunos dispositivos)
          await new Promise((r) => setTimeout(r, 300));
          // Buscar dispositivos disponibles
          const dispositivos = await this.buscarDispositivosBluetooth();
          
          if (dispositivos.length === 0) {
            throw new Error(
              'No se encontraron dispositivos Bluetooth disponibles.\n\n' +
              'Por favor:\n' +
              '1. Active Bluetooth en su dispositivo\n' +
              '2. Asegúrese de que la impresora esté encendida\n' +
              '3. Empareje la impresora con su dispositivo\n' +
              '4. Intente nuevamente'
            );
          }

          // Siempre mostrar selector (1 o más dispositivos), igual que en ProbarImpresionScreen.
          // La conexión se hace solo al seleccionar el dispositivo, evitando cierre de app al conectar dentro de esta misma llamada.
          const mensaje = dispositivos.length === 1
            ? 'Se encontró 1 dispositivo. Selecciónelo para continuar.'
            : `Se encontraron ${dispositivos.length} dispositivos Bluetooth disponibles. Por favor, seleccione uno.`;
          const error = new Error(mensaje);
          error.dispositivos = dispositivos;
          error.codigo = 'MULTIPLES_DISPOSITIVOS';
          throw error;
        }
      }

      // Enviar comandos ESC/POS a la impresora
      try {
        if (!BluetoothEscposPrinter) {
          throw new Error('La librería de impresión Bluetooth no está disponible');
        }

        console.log('Enviando comandos a la impresora...');
        
        // Combinar todos los comandos en un solo string
        const textoCompleto = comandos.join('');
        
        // Verificar que printText esté disponible
        if (!BluetoothEscposPrinter.printText) {
          throw new Error('El método printText no está disponible en la librería');
        }

        // Enviar el texto completo a la impresora
        // La librería puede requerir diferentes formatos según la versión
        try {
          // Intentar primero con el formato estándar (texto, opciones)
          if (BluetoothEscposPrinter.printText && typeof BluetoothEscposPrinter.printText === 'function') {
            // Algunas versiones requieren opciones específicas, otras no
            try {
              await BluetoothEscposPrinter.printText(textoCompleto, { encoding: 'UTF-8' });
            } catch (optsError) {
              // Si falla con opciones, intentar sin opciones
              console.warn('Error con opciones, intentando sin opciones:', optsError);
              await BluetoothEscposPrinter.printText(textoCompleto);
            }
          } else if (BluetoothEscposPrinter.print) {
            // Algunas versiones usan 'print' en lugar de 'printText'
            await BluetoothEscposPrinter.print(textoCompleto);
          } else {
            throw new Error('No se encontró método de impresión disponible en la librería');
          }
        } catch (printError) {
          console.error('Error detallado al imprimir:', printError);
          throw printError;
        }
        
        console.log('Comprobante enviado exitosamente a la impresora');
        return true;
      } catch (error) {
        console.error('Error al enviar a la impresora:', error);
        // Intentar desconectar en caso de error
        try {
          await this.desconectarImpresora();
        } catch (disconnectError) {
          console.error('Error al desconectar:', disconnectError);
        }
        throw new Error(`Error al imprimir: ${error.message}`);
      }
    } catch (error) {
      console.error('Error al imprimir comprobante:', error);
      throw error; // Lanzar el error para que lo maneje el componente que llama
    }
  }

  /**
   * Genera comandos ESC/POS para la impresora (formato comprobante según imagen: institución, tipo, monto, detalle, pie).
   * @param {Object} datos - Datos del comprobante
   * @returns {Array} Array de comandos ESC/POS
   */
  static generarComandosESCPOS(datos) {
    const {
      fecha,
      referencia,
      monto,
      comision,
      total,
      tipo,
      cliente,
      numeroCuenta,
      codigoOperacion,
      observacion,
      usuario,
      negocio,
      identificacionCliente
    } = datos;

    const comandos = [];
    const width = this.PRINTER_CONFIG.width;
    const estaticos = this.COMPROBANTE_DATOS_ESTATICOS;
    const codigoOp = codigoOperacion || referencia;

    // Inicializar impresora (ESC @)
    comandos.push('\x1B\x40'); // Reset printer
    comandos.push('\x1B\x61\x01'); // Center align

    // Encabezado (solo lo que muestra la imagen)
    if (estaticos.nombreEmpresa) {
      comandos.push('\x1D\x21\x01'); // Double height
      comandos.push(this.centrarTexto(estaticos.nombreEmpresa.toUpperCase(), width) + '\n');
      comandos.push('\x1D\x21\x00');
    }
    comandos.push(this.centrarTexto('REGULADO Y SUPERVISADO POR LA S.B.S', width) + '\n');
    if (estaticos.ruc) comandos.push(`RUC:${estaticos.ruc}\n`);    
    comandos.push(this.centrarTexto('Operación realizada en su Asesor Virtual', width) + '\n\n');
    comandos.push('\x1B\x61\x00'); // Left align
    comandos.push('────────────────────────────\n');
    comandos.push('\x1B\x61\x01');
    comandos.push(this.centrarTexto((tipo || 'DEPOSITO EN CUENTA').toUpperCase(), width) + '\n');
    comandos.push('\x1D\x21\x11'); // Double size amount
    comandos.push(this.centrarTexto(`S/ ${parseFloat(monto).toFixed(2)}`, width) + '\n');
    comandos.push('\x1D\x21\x00');
    comandos.push('\x1B\x61\x00');
    comandos.push('────────────────────────────\n');
    const fechaHora = this.normalizarFechaHora(fecha);
    comandos.push(`Fecha y Hora: ${fechaHora}\n`);
    if (identificacionCliente != null && String(identificacionCliente).trim() !== '') {
      comandos.push(`Identificación Socio: ${String(identificacionCliente).trim()}\n`);
    }
    if (cliente != null && String(cliente).trim() !== '') {
      comandos.push(`Nombre del Socio: ${this.truncarTexto(String(cliente).trim(), width - 20)}\n`);
    }
    if (numeroCuenta != null && String(numeroCuenta).trim() !== '') {
      comandos.push(`N° de Cuenta: ${this.enmascararNumeroCuenta(numeroCuenta)}\n`);
    }
    comandos.push(`Código Operación: ${codigoOp || 'N/A'}\n`);
    if (observacion != null && String(observacion).trim() !== '') {
      comandos.push(`Observación: :${observacion}\n`);
    }
    comandos.push('────────────────────────────\n');
    if (negocio != null && String(negocio).trim() !== '') {
      comandos.push(`NEGOCIO: ${String(negocio).trim()}\n`);
    }
    if (usuario != null && String(usuario).trim() !== '') {
      comandos.push(`USUARIO: ${String(usuario).trim()}\n`);
    }
    if (estaticos.atencionAlSocio) comandos.push(`ATENCION AL SOCIO: ${estaticos.atencionAlSocio}\n`);
    comandos.push('\x1D\x56\x00'); // Cortar papel
    return comandos;
  }

  /**
   * Formatea el contenido del comprobante para impresión (versión texto plano, mismo formato que la imagen).
   * @param {Object} datos - Datos del comprobante
   * @returns {string} Contenido formateado
   */
  static formatearComprobante(datos) {
    const {
      fecha,
      referencia,
      monto,
      comision,
      total,
      tipo,
      cliente,
      numeroCuenta,
      codigoOperacion,
      observacion,
      usuario,
      negocio,
      identificacionCliente
    } = datos;

    const width = this.PRINTER_CONFIG.width;
    const estaticos = this.COMPROBANTE_DATOS_ESTATICOS;
    const codigoOp = codigoOperacion || referencia;
    let contenido = '';

    if (estaticos.nombreEmpresa) contenido += this.centrarTexto(estaticos.nombreEmpresa.toUpperCase(), width) + '\n';
    if (estaticos.ruc) contenido += `RUC:${estaticos.ruc}\n`;
    contenido += this.centrarTexto('REGULADO Y SUPERVISADO POR LA S.B.S', width) + '\n';
    contenido += this.centrarTexto('Operación realizada en su Asesor Virtual', width) + '\n\n';
    contenido += '────────────────────────────\n';
    contenido += this.centrarTexto((tipo || 'DEPOSITO EN CUENTA').toUpperCase(), width) + '\n';
    contenido += this.centrarTexto(`S/ ${parseFloat(monto).toFixed(2)}`, width) + '\n';
    contenido += '────────────────────────────\n';
    const fechaHora = this.normalizarFechaHora(fecha);
    contenido += `Fecha y Hora: ${fechaHora}\n`;
    if (identificacionCliente != null && String(identificacionCliente).trim() !== '') {
      contenido += `Identificación Socio: ${String(identificacionCliente).trim()}\n`;
    }
    if (cliente != null && String(cliente).trim() !== '') {
      contenido += `Nombre del Socio: ${this.truncarTexto(String(cliente).trim(), width - 20)}\n`;
    }
    if (numeroCuenta != null && String(numeroCuenta).trim() !== '') {
      contenido += `N° de Cuenta: ${this.enmascararNumeroCuenta(numeroCuenta)}\n`;
    }
    contenido += `Código Operación: ${codigoOp || 'N/A'}\n`;
    if (observacion != null && String(observacion).trim() !== '') {
      contenido += `Observación: :${observacion}\n`;
    }
    contenido += '────────────────────────────\n';
    if (negocio != null && String(negocio).trim() !== '') {
      contenido += `NEGOCIO: ${String(negocio).trim()}\n`;
    }
    if (usuario != null && String(usuario).trim() !== '') {
      contenido += `USUARIO: ${String(usuario).trim()}\n`;
    }
    if (estaticos.atencionAlSocio) contenido += `ATENCION AL SOCIO: ${estaticos.atencionAlSocio}\n`;
    return contenido;
  }

  /**
   * Centra un texto según el ancho de la impresora
   * @param {string} texto - Texto a centrar
   * @param {number} ancho - Ancho total
   * @returns {string} Texto centrado
   */
  static centrarTexto(texto, ancho) {
    const espacios = Math.max(0, Math.floor((ancho - texto.length) / 2));
    return ' '.repeat(espacios) + texto;
  }

  /**
   * Genera espacios para alineación
   * @param {number} cantidad - Cantidad de espacios
   * @returns {string} Cadena de espacios
   */
  static espacios(cantidad) {
    return ' '.repeat(Math.max(0, cantidad));
  }

  /**
   * Trunca un texto si excede el largo máximo
   * @param {string} texto - Texto a truncar
   * @param {number} maxLength - Longitud máxima
   * @returns {string} Texto truncado
   */
  static truncarTexto(texto, maxLength) {
    if (!texto) return '';
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength - 3) + '...';
  }

  /**
   * Enmascara número de cuenta: primeros 7 + ***** + últimos 3 (ej. 1630071*****917)
   * @param {string} numeroCuenta - Número de cuenta
   * @returns {string} Cuenta enmascarada
   */
  static enmascararNumeroCuenta(numeroCuenta) {
    if (!numeroCuenta || typeof numeroCuenta !== 'string') return numeroCuenta || '';
    const s = String(numeroCuenta).trim();
    if (s.length <= 10) return s;
    return s.substring(0, 7) + '*****' + s.substring(s.length - 3);
  }

  /**
   * Normaliza fecha para comprobante: si viene solo fecha (sin hora), añade la hora actual.
   * @param {string} [fecha] - Fecha desde el API (puede ser solo fecha)
   * @returns {string} Fecha y hora en formato locale (es-EC)
   */
  static normalizarFechaHora(fecha) {
    const ahora = new Date();
    const conHora = () => ahora.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'medium' });
    if (!fecha) return conHora();
    const s = String(fecha).trim();
    if (!s) return conHora();
    if (/:\d{2}/.test(s)) return s;
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'medium' });
    }
    return s + ' ' + ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /**
   * Solicita los permisos de Bluetooth necesarios
   * @returns {Promise<boolean>} true si los permisos fueron concedidos
   * @throws {Error} Si los permisos fueron denegados
   */
  static async solicitarPermisosBluetooth() {
    if (Platform.OS !== 'android') {
      return true; // No se necesitan permisos en otras plataformas
    }

    try {
      const androidVersion = Platform.Version;
      
      // Para Android 12+ (API 31+), se necesitan permisos diferentes
      if (androidVersion >= 31) {
        // Los permisos de Android 12+ pueden no estar en PermissionsAndroid.PERMISSIONS
        // Usamos las constantes directamente
        const permisos = [
          'android.permission.BLUETOOTH_CONNECT',
          'android.permission.BLUETOOTH_SCAN',
        ];

        try {
          const resultados = await PermissionsAndroid.requestMultiple(permisos);
          
          const todosConcedidos = permisos.every(
            permiso => resultados[permiso] === PermissionsAndroid.RESULTS.GRANTED
          );

          if (!todosConcedidos) {
            const permisosDenegados = permisos.filter(
              permiso => resultados[permiso] !== PermissionsAndroid.RESULTS.GRANTED
            );
            throw new Error(
              'Se requieren permisos de Bluetooth para usar la impresión.\n\n' +
              `Permisos denegados: ${permisosDenegados.join(', ')}\n\n` +
              'Por favor:\n' +
              '1. Vaya a Configuración > Aplicaciones > [Su App]\n' +
              '2. Seleccione "Permisos"\n' +
              '3. Conceda los permisos de Bluetooth (Conectar y Escanear)\n' +
              '4. Vuelva a intentar la prueba'
            );
          }

          return true;
        } catch (error) {
          if (error.message && error.message.includes('Se requieren permisos')) {
            throw error;
          }
          // Si falla la solicitud de permisos, intentar continuar de todos modos
          // ya que algunos dispositivos pueden tener los permisos ya concedidos
          console.warn('Advertencia al solicitar permisos:', error);
          return true;
        }
      } else {
        // Para Android 6-11, se necesitan permisos de ubicación para escanear Bluetooth
        const permisos = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];

        const resultados = await PermissionsAndroid.requestMultiple(permisos);
        
        const todosConcedidos = permisos.every(
          permiso => resultados[permiso] === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!todosConcedidos) {
          throw new Error(
            'Se requiere permiso de ubicación para escanear dispositivos Bluetooth.\n\n' +
            'Por favor, conceda el permiso de ubicación en la configuración de la aplicación.'
          );
        }

        return true;
      }
    } catch (error) {
      console.error('Error al solicitar permisos de Bluetooth:', error);
      if (error.message) {
        throw error;
      }
      throw new Error(
        'No se pudieron solicitar los permisos de Bluetooth.\n\n' +
        'Por favor, conceda los permisos manualmente en Configuración > Aplicaciones.'
      );
    }
  }

  /**
   * Verifica si Bluetooth está disponible y habilitado
   * @returns {Promise<boolean>} true si Bluetooth está disponible
   * @throws {Error} Si hay un problema específico con Bluetooth o la librería
   */
  static async verificarBluetooth() {
    if (Platform.OS !== 'android') {
      throw new Error('La impresión Bluetooth solo está disponible en Android');
    }

    if (!BluetoothManager || !BluetoothEscposPrinter) {
      console.error('BluetoothManager o BluetoothEscposPrinter no está disponible');
      console.error('Platform.OS:', Platform.OS);
      console.error('Platform.Version:', Platform.Version);
      console.error('Error de carga:', errorCarga);
      console.error('BluetoothManager disponible:', !!BluetoothManager);
      console.error('BluetoothEscposPrinter disponible:', !!BluetoothEscposPrinter);
      
      let mensajeError = 'La librería de impresión Bluetooth no está disponible.\n\n';
      mensajeError += 'Diagnóstico:\n';
      mensajeError += `- Plataforma: ${Platform.OS}\n`;
      mensajeError += `- Versión Android: ${Platform.OS === 'android' ? Platform.Version : 'N/A'}\n`;
      if (errorCarga) {
        mensajeError += `- Error al cargar: ${errorCarga}\n`;
      }
      mensajeError += '\n';
      
      mensajeError += 'Posibles causas:\n';
      mensajeError += '1. La librería no está instalada o vinculada correctamente\n';
      mensajeError += '2. El código nativo no está compilado (requiere rebuild)\n';
      mensajeError += '3. Está usando Expo Go (no compatible con módulos nativos)\n';
      mensajeError += '4. La librería no está correctamente configurada en build.gradle\n\n';
      
      mensajeError += '⚠️ PROBLEMA DETECTADO:\n';
      mensajeError += 'La librería react-native-bluetooth-escpos-printer (v0.0.5)\n';
      mensajeError += 'puede no ser compatible con React Native 0.79.6 y Expo 53.\n\n';
      
      mensajeError += 'VERIFICACIONES INMEDIATAS:\n';
      mensajeError += '1. Verifique en la consola de Metro/React Native si hay errores\n';
      mensajeError += '   relacionados con "react-native-bluetooth-escpos-printer"\n\n';
      mensajeError += '2. Verifique que la librería esté en node_modules:\n';
      mensajeError += '   ls node_modules/react-native-bluetooth-escpos-printer\n\n';
      mensajeError += '3. Revise los logs de Android Studio o adb logcat para ver\n';
      mensajeError += '   si hay errores de carga del módulo nativo\n\n';
      
      mensajeError += 'SOLUCIONES PASO A PASO:\n';
      mensajeError += '1. Reinstale la librería:\n';
      mensajeError += '   npm uninstall react-native-bluetooth-escpos-printer\n';
      mensajeError += '   npm install react-native-bluetooth-escpos-printer@^0.0.5\n\n';
      mensajeError += '2. Limpie completamente el proyecto:\n';
      mensajeError += '   cd android\n';
      mensajeError += '   ./gradlew clean\n';
      mensajeError += '   cd ..\n';
      mensajeError += '   rm -rf node_modules\n';
      mensajeError += '   npm install\n\n';
      mensajeError += '3. Reconstruya la aplicación:\n';
      mensajeError += '   npx expo run:android\n\n';
      mensajeError += '4. IMPORTANTE: NO use Expo Go. Debe usar:\n';
      mensajeError += '   - Development build (npx expo run:android)\n';
      mensajeError += '   - O build de producción\n\n';
      mensajeError += '5. Si el problema persiste, la librería puede necesitar\n';
      mensajeError += '   vinculación manual. Verifique:\n';
      mensajeError += '   - android/settings.gradle (debe incluir el módulo)\n';
      mensajeError += '   - android/app/build.gradle (dependencias)\n';
      mensajeError += '   - MainApplication.kt (registro del paquete)\n\n';
      mensajeError += '6. ALTERNATIVA: Considere usar una librería más moderna:\n';
      mensajeError += '   - @react-native-bluetooth/bluetooth (si existe)\n';
      mensajeError += '   - O una librería específica para impresoras ESC/POS\n\n';
      mensajeError += '7. Revise los logs completos en:\n';
      mensajeError += '   - Metro bundler (terminal donde ejecuta expo start)\n';
      mensajeError += '   - Android Studio Logcat\n';
      mensajeError += '   - adb logcat | grep -i bluetooth';
      
      throw new Error(mensajeError);
    }

    // Verificar que los métodos necesarios estén disponibles
    console.log('Verificando métodos de BluetoothManager y BluetoothEscposPrinter...');
    if (BluetoothManager) {
      console.log('Métodos disponibles en BluetoothManager:', Object.keys(BluetoothManager));
      console.log('list disponible:', typeof BluetoothManager.list);
    }
    if (BluetoothEscposPrinter) {
      console.log('Métodos disponibles en BluetoothEscposPrinter:', Object.keys(BluetoothEscposPrinter));
      console.log('connect disponible:', typeof BluetoothEscposPrinter.connect);
    }
    
    if (!BluetoothManager || !BluetoothManager.list || typeof BluetoothManager.list !== 'function') {
      const metodosDisponibles = BluetoothManager ? Object.keys(BluetoothManager).join(', ') : 'ninguno';
      throw new Error(
        'La librería de impresión no está correctamente inicializada.\n\n' +
        'El método list() no está disponible en BluetoothManager.\n' +
        `Métodos disponibles: ${metodosDisponibles}\n\n` +
        'Por favor:\n' +
        '1. Verifique que la librería esté correctamente instalada\n' +
        '2. Reconstruya la aplicación: npx expo run:android\n' +
        '3. Verifique que NO esté usando Expo Go (requiere build nativo)\n' +
        '4. Limpie el build: cd android && ./gradlew clean && cd ..\n' +
        '5. Reconstruya: npx expo run:android'
      );
    }

    // Solicitar permisos primero
    try {
      await this.solicitarPermisosBluetooth();
    } catch (permisoError) {
      throw permisoError; // Re-lanzar el error de permisos
    }

    // Verificar si Bluetooth está habilitado intentando listar dispositivos
    try {
      await BluetoothManager.list();
      return true;
    } catch (error) {
      console.error('Error al verificar Bluetooth:', error);
      const errorMsg = error.message || String(error);
      const errorStr = String(error).toLowerCase();
      
      if (errorMsg.includes('Bluetooth') || errorStr.includes('bluetooth')) {
        throw new Error(
          'Bluetooth no está disponible o no está activado.\n\n' +
          'Por favor:\n' +
          '1. Active Bluetooth en la configuración de su dispositivo\n' +
          '2. Asegúrese de que los permisos de Bluetooth estén concedidos a la aplicación\n' +
          '3. Verifique que Bluetooth esté funcionando correctamente en su dispositivo'
        );
      } else if (errorMsg.includes('DIRECTION') || errorMsg.includes('undefined') || errorStr.includes('permission')) {
        throw new Error(
          'Error de permisos o inicialización de Bluetooth.\n\n' +
          'Por favor:\n' +
          '1. Verifique que los permisos de Bluetooth estén configurados en AndroidManifest.xml:\n' +
          '   - BLUETOOTH\n' +
          '   - BLUETOOTH_ADMIN\n' +
          '   - BLUETOOTH_CONNECT (Android 12+)\n' +
          '   - BLUETOOTH_SCAN (Android 12+)\n' +
          '2. Conceda los permisos manualmente en Configuración > Aplicaciones\n' +
          '3. Reconstruya la aplicación: npx expo run:android'
        );
      } else if (errorStr.includes('not found') || errorStr.includes('module')) {
        throw new Error(
          'La librería de impresión no se encuentra.\n\n' +
          'Por favor:\n' +
          '1. Instale la librería: npm install react-native-bluetooth-escpos-printer\n' +
          '2. Reconstruya la aplicación: npx expo run:android\n' +
          '3. No use Expo Go, requiere un build nativo'
        );
      }
      
      // Error genérico con detalles
      throw new Error(
        `Error al verificar Bluetooth: ${errorMsg}\n\n` +
        'Por favor, verifique:\n' +
        '1. Que Bluetooth esté activado\n' +
        '2. Que los permisos estén concedidos\n' +
        '3. Que la librería esté correctamente instalada'
      );
    }
  }
}

export default PrintService;
