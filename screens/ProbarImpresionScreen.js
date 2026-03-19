import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { useCustomModal } from '../hooks/useCustomModal';
import PrintService from '../services/PrintService';
import { colors, globalStyles } from '../styles/globalStyles';

const { width: screenWidth } = Dimensions.get('window');

const LOG_TYPES = { info: 'info', success: 'success', error: 'error' };

export default function ProbarImpresionScreen() {
  const router = useRouter();
  const [probandoImpresion, setProbandoImpresion] = useState(false);
  const [logEntries, setLogEntries] = useState([]);
  const [dispositivosEncontrados, setDispositivosEncontrados] = useState([]);
  const [modalErrorImpresionVisible, setModalErrorImpresionVisible] = useState(false);
  const [guardandoPdf, setGuardandoPdf] = useState(false);
  const logScrollRef = React.useRef(null);
  const { modalVisible, modalData, mostrarAdvertencia, mostrarError, mostrarInfo, mostrarExito, cerrarModal } = useCustomModal();

  const addLog = (text, type = LOG_TYPES.info) => {
    setLogEntries((prev) => [...prev, { key: Date.now() + Math.random(), text, type }]);
  };

  const clearLog = () => setLogEntries([]);

  const conectarYProbarConDispositivo = async (impresoraSeleccionada) => {
    const nombreImpresora = impresoraSeleccionada?.name || impresoraSeleccionada?.Name || 'Impresora';
    const direccionImpresora =
      impresoraSeleccionada?.address ||
      impresoraSeleccionada?.Address ||
      impresoraSeleccionada?.id ||
      impresoraSeleccionada?.Id;

    if (!direccionImpresora) {
      addLog('No se pudo obtener la dirección de la impresora.', LOG_TYPES.error);
      mostrarError('Error', 'No se pudo obtener la dirección del dispositivo seleccionado.');
      return;
    }

    setProbandoImpresion(true);
    setDispositivosEncontrados([]);

    try {
      addLog(`Conectando a: ${nombreImpresora}...`, LOG_TYPES.info);
      await PrintService.conectarImpresora(direccionImpresora);
      addLog('Conectado.', LOG_TYPES.success);

      addLog('Enviando comprobante de prueba...', LOG_TYPES.info);
      const fechaActual = new Date().toLocaleString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const comprobantePrueba = {
        fecha: fechaActual,
        referencia: 'PRUEBA-' + Date.now(),
        monto: 100.0,
        comision: 5.0,
        total: 105.0,
        tipo: 'Prueba de Impresión',
        cliente: 'Socio de Prueba',
      };

      const exito = await PrintService.imprimirComprobante(comprobantePrueba);

      if (exito) {
        addLog('Comprobante enviado correctamente.', LOG_TYPES.success);
        addLog('Desconectando impresora...', LOG_TYPES.info);
        await PrintService.desconectarImpresora();
        addLog('Prueba finalizada con éxito.', LOG_TYPES.success);
        const nombreFinal = impresoraSeleccionada?.name || impresoraSeleccionada?.Name || 'Desconocida';
        mostrarExito(
          'Prueba exitosa',
          `La impresión se realizó correctamente.\n\nImpresora: ${nombreFinal}\nComprobante: ${comprobantePrueba.referencia}`
        );
      } else {
        addLog('La impresión no se completó correctamente.', LOG_TYPES.error);
        mostrarError('Error', 'La impresión no se completó correctamente.');
      }
    } catch (error) {
      console.error('Error al conectar/imprimir:', error);
      addLog('Error al conectar o imprimir.', LOG_TYPES.error);
      addLog('  Mensaje: ' + (error?.message || String(error)), LOG_TYPES.error);

      const detalle = error?.detalleConexion;
      if (detalle) {
        addLog('  deviceId usado: ' + (detalle.deviceId ?? '—'), LOG_TYPES.error);
        if (detalle.code !== undefined && detalle.code !== null) {
          addLog('  Código: ' + detalle.code, LOG_TYPES.error);
        }
        if (detalle.nativeErrorMessage) {
          addLog('  Error nativo (Android): ' + detalle.nativeErrorMessage, LOG_TYPES.error);
        }
        if (detalle.message && detalle.message !== error?.message) {
          addLog('  Mensaje nativo: ' + detalle.message, LOG_TYPES.error);
        }
        if (Array.isArray(detalle.sugerencias) && detalle.sugerencias.length > 0) {
          addLog('  Sugerencias:', LOG_TYPES.info);
          detalle.sugerencias.forEach((s) => addLog('    • ' + s, LOG_TYPES.info));
        }
        if (detalle.escposMethods) {
          addLog('  BluetoothEscposPrinter: ' + detalle.escposMethods, LOG_TYPES.error);
        }
        if (detalle.managerMethods) {
          addLog('  BluetoothManager: ' + detalle.managerMethods, LOG_TYPES.error);
        }
        if (detalle.stack) {
          const stackLines = detalle.stack.split('\n').slice(0, 5);
          stackLines.forEach((line) => addLog('  ' + line.trim(), LOG_TYPES.error));
        }
      } else {
        if (error?.code !== undefined && error?.code !== null) {
          addLog('  Código: ' + error.code, LOG_TYPES.error);
        }
        if (error?.nativeErrorMessage) {
          addLog('  Error nativo: ' + error.nativeErrorMessage, LOG_TYPES.error);
        }
      }

      try {
        await PrintService.desconectarImpresora();
        addLog('Desconectado tras error.', LOG_TYPES.info);
      } catch (e) {
        console.error('Error al desconectar:', e);
      }
      setModalErrorImpresionVisible(true);
    } finally {
      setProbandoImpresion(false);
    }
  };

  const cerrarModalErrorImpresion = () => {
    setModalErrorImpresionVisible(false);
  };

  const buildComprobantePruebaHtml = () => {
    const estaticos = PrintService.COMPROBANTE_DATOS_ESTATICOS;
    const fechaActual = new Date().toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const fechaHora = PrintService.normalizarFechaHora(fechaActual);
    const referencia = 'PRUEBA-' + Date.now();
    const rows = [];
    if (estaticos.nombreEmpresa) rows.push(`<tr><td colspan="2" style="text-align:center;font-weight:bold;font-size:14px;">${estaticos.nombreEmpresa}</td></tr>`);
    rows.push(`<tr><td colspan="2" style="text-align:center;font-size:11px;">REGULADO Y SUPERVISADO POR LA S.B.S</td></tr>`);
    if (estaticos.ruc) rows.push(`<tr><td colspan="2" style="text-align:center;">RUC: ${estaticos.ruc}</td></tr>`);
    rows.push(`<tr><td colspan="2" style="text-align:center;font-size:11px;">Operación realizada en su Asesor Virtual</td></tr>`);
    rows.push(`<tr><td colspan="2"><hr/></td></tr>`);
    rows.push(`<tr><td colspan="2" style="text-align:center;font-weight:bold;">PRUEBA DE IMPRESIÓN</td></tr>`);
    rows.push(`<tr><td colspan="2" style="text-align:center;font-size:16px;font-weight:bold;">$ 105.00</td></tr>`);
    rows.push(`<tr><td colspan="2"><hr/></td></tr>`);
    rows.push(`<tr><td style="font-weight:bold;">Fecha y Hora:</td><td>${fechaHora}</td></tr>`);
    rows.push(`<tr><td style="font-weight:bold;">Nombre del Socio:</td><td>Socio de Prueba</td></tr>`);
    rows.push(`<tr><td style="font-weight:bold;">Código Operación:</td><td>${referencia}</td></tr>`);
    rows.push(`<tr><td colspan="2"><hr/></td></tr>`);
    if (estaticos.atencionAlSocio) rows.push(`<tr><td colspan="2">ATENCION AL SOCIO: ${estaticos.atencionAlSocio}</td></tr>`);
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Comprobante de prueba</title></head>
<body style="font-family:sans-serif;font-size:12px;padding:20px;">
<table width="100%" cellpadding="4" cellspacing="0">${rows.join('')}</table>
</body>
</html>`;
  };

  const handleGuardarPdf = async () => {
    if (Platform.OS === 'web') {
      mostrarInfo('No disponible', 'Guardar como PDF no está disponible en la versión web.');
      cerrarModalErrorImpresion();
      return;
    }
    setGuardandoPdf(true);
    try {
      const html = buildComprobantePruebaHtml();
      const { uri } = await Print.printToFileAsync({ html, width: 300 });
      const puedeCompartir = await Sharing.isAvailableAsync();
      if (puedeCompartir) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Guardar comprobante de prueba como PDF',
        });
        mostrarExito('Comprobante guardado', 'Puede guardar o compartir el archivo PDF desde la opción que eligió.');
      } else {
        mostrarExito('Comprobante generado', 'El PDF se generó correctamente. Puede abrirlo desde la ubicación del archivo.');
      }
      cerrarModalErrorImpresion();
    } catch (err) {
      console.error('Error al generar PDF:', err);
      mostrarError('Error', err.message || 'No se pudo generar el archivo PDF.');
    } finally {
      setGuardandoPdf(false);
    }
  };

  const handleProbarImpresion = async () => {
    if (Platform.OS === 'web') {
      mostrarAdvertencia(
        'Impresión no disponible en Web',
        'La impresión Bluetooth solo está disponible en dispositivos Android.\n\n' +
          'Para probar la funcionalidad de impresión:\n' +
          '1. Ejecute la aplicación en un dispositivo Android\n' +
          '2. O use: npx expo run:android\n\n' +
          'La impresión requiere acceso a APIs nativas de Bluetooth que no están disponibles en navegadores web.'
      );
      return;
    }

    setProbandoImpresion(true);
    clearLog();
    addLog('Iniciando prueba de impresión...', LOG_TYPES.info);

    try {
      addLog('Comprobando Bluetooth...', LOG_TYPES.info);

      try {
        const bluetoothDisponible = await PrintService.verificarBluetooth();
        if (!bluetoothDisponible) {
          addLog('Bluetooth no disponible o sin permisos.', LOG_TYPES.error);
          mostrarAdvertencia(
            'Bluetooth no disponible',
            'No se pudo verificar la disponibilidad de Bluetooth.\n\n' +
              'Por favor, verifique que Bluetooth esté activado y que la aplicación tenga los permisos necesarios.'
          );
          setProbandoImpresion(false);
          return;
        }
        addLog('Bluetooth activo.', LOG_TYPES.success);
      } catch (bluetoothError) {
        console.error('Error al verificar Bluetooth:', bluetoothError);
        addLog('Error al verificar Bluetooth: ' + (bluetoothError.message || 'Error desconocido'), LOG_TYPES.error);
        mostrarError(
          'Error al verificar Bluetooth',
          bluetoothError.message || 'Ocurrió un error al verificar Bluetooth. Por favor, intente nuevamente.'
        );
        setProbandoImpresion(false);
        return;
      }

      addLog('Ejecutando búsqueda de dispositivos...', LOG_TYPES.info);

      const dispositivos = await PrintService.buscarDispositivosBluetooth();

      if (!dispositivos || !Array.isArray(dispositivos)) {
        console.error('Dispositivos no es un array válido:', dispositivos);
        addLog('Error: no se pudo obtener la lista de dispositivos.', LOG_TYPES.error);
        mostrarAdvertencia(
          'Error al buscar dispositivos',
          'No se pudo obtener la lista de dispositivos Bluetooth correctamente.\n\n' +
            'Por favor, intente nuevamente o verifique que Bluetooth esté activado.'
        );
        setProbandoImpresion(false);
        return;
      }

      if (dispositivos.length === 0) {
        addLog('No se ha encontrado ningún dispositivo.', LOG_TYPES.error);
        mostrarAdvertencia(
          'No se encontraron impresoras',
          'No se encontraron dispositivos Bluetooth disponibles.\n\n' +
            'Por favor:\n' +
            '1. Active Bluetooth en su dispositivo\n' +
            '2. Asegúrese de que la impresora esté encendida\n' +
            '3. Empareje la impresora con su dispositivo\n' +
            '4. Intente nuevamente'
        );
        setProbandoImpresion(false);
        return;
      }

      addLog(`Dispositivos encontrados: ${dispositivos.length}`, LOG_TYPES.success);
      addLog('Seleccione un dispositivo de la lista para conectar.', LOG_TYPES.info);
      setDispositivosEncontrados(dispositivos);
      setProbandoImpresion(false);
      return;
    } catch (error) {
      console.error('Error al probar impresión:', error);
      addLog('Error: ' + (error?.message || String(error)), LOG_TYPES.error);

      let mensajeError =
        'Ocurrió un error al probar la conexión e impresión.\n\n';
      if (error && error.message) {
        mensajeError = error.message;
      } else if (typeof error === 'string') {
        mensajeError = error;
      } else if (error && error.toString) {
        mensajeError = error.toString();
      }

      if (
        mensajeError.includes('undefined') ||
        mensajeError.includes('is not a function')
      ) {
        mensajeError += '\n\nPosibles causas:\n';
        mensajeError += '1. La librería Bluetooth no está correctamente vinculada\n';
        mensajeError += '2. El método list() no está disponible en BluetoothManager\n';
        mensajeError += '3. Necesita reconstruir la aplicación: npx expo run:android\n';
        mensajeError += '4. Verifique los logs de la consola para más detalles';
      } else {
        mensajeError += '\n\nPor favor, verifique:\n';
        mensajeError += '1. Que Bluetooth esté activado\n';
        mensajeError += '2. Que la impresora esté encendida y emparejada\n';
        mensajeError += '3. Que la impresora esté cerca del dispositivo';
      }

      mostrarError('Error en la prueba', mensajeError);

      try {
        await PrintService.desconectarImpresora();
        addLog('Desconectado tras error.', LOG_TYPES.info);
      } catch (disconnectError) {
        console.error('Error al desconectar:', disconnectError);
      }
    } finally {
      setProbandoImpresion(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#325191', '#38599E']}
        style={styles.gradient}
      >
        <View style={globalStyles.header}>
          <View style={globalStyles.headerContent}>
            <TouchableOpacity
              style={globalStyles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={globalStyles.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={globalStyles.headerTitleContainer}>
              <Text style={globalStyles.headerTitle} numberOfLines={1}>
                Probar impresión
              </Text>
            </View>
            <View style={globalStyles.menuButton} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.description}>
              Desde aquí puede verificar la conexión Bluetooth y probar que la
              impresora reciba un comprobante de prueba. Asegúrese de tener
              Bluetooth activado y la impresora encendida y emparejada.
              {' '}
              Si usa una app que emula impresora (ej. Bluetooth Printer Simulator), ábrala y actívela en modo «Servidor» o «Esperando conexión» antes de ejecutar la prueba.
            </Text>
            <TouchableOpacity
              style={[styles.runButton, probandoImpresion && styles.runButtonDisabled]}
              onPress={handleProbarImpresion}
              disabled={probandoImpresion}
            >
              {probandoImpresion ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.runButtonText}>EJECUTAR PRUEBA</Text>
              )}
            </TouchableOpacity>

            {dispositivosEncontrados.length > 0 && (
              <View style={styles.deviceListSection}>
                <Text style={styles.deviceListTitle}>Seleccione la impresora a la que desea conectar:</Text>
                <ScrollView style={styles.deviceListScroll} nestedScrollEnabled>
                  {dispositivosEncontrados.map((d, index) => {
                    const nombre = d?.name || d?.Name || 'Sin nombre';
                    const direccion = d?.address || d?.Address || d?.id || d?.Id || '';
                    return (
                      <TouchableOpacity
                        key={direccion || index}
                        style={styles.deviceItem}
                        onPress={() => conectarYProbarConDispositivo(d)}
                        disabled={probandoImpresion}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deviceItemName} numberOfLines={1}>{nombre}</Text>
                        {direccion ? (
                          <Text style={styles.deviceItemAddress} numberOfLines={1}>{direccion}</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={styles.cancelDeviceListButton}
                  onPress={() => setDispositivosEncontrados([])}
                  disabled={probandoImpresion}
                >
                  <Text style={styles.cancelDeviceListText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}

            {logEntries.length > 0 && (
              <>
                <View style={styles.logHeader}>
                  <Text style={styles.logTitle}>Registro de pasos</Text>
                  <TouchableOpacity
                    onPress={clearLog}
                    disabled={probandoImpresion}
                    style={styles.clearLogButton}
                  >
                    <Text style={styles.clearLogText}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  ref={logScrollRef}
                  style={styles.logScroll}
                  contentContainerStyle={styles.logContent}
                  onContentSizeChange={() => logScrollRef.current?.scrollToEnd({ animated: true })}
                  nestedScrollEnabled
                >
                  {logEntries.map((entry) => (
                    <Text
                      key={entry.key}
                      style={[
                        styles.logLine,
                        entry.type === LOG_TYPES.success && styles.logSuccess,
                        entry.type === LOG_TYPES.error && styles.logError,
                      ]}
                    >
                      {entry.text}
                    </Text>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Modal: error de impresión + opción guardar como PDF */}
      <Modal
        visible={modalErrorImpresionVisible}
        transparent
        animationType="fade"
        onRequestClose={cerrarModalErrorImpresion}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalErrorImpresionContainer}>
            <LinearGradient
              colors={['#325191', '#2a4580']}
              style={styles.modalErrorImpresionGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <View style={styles.modalErrorImpresionIcon}>
                <MaterialIcons name="error-outline" size={48} color="#fff" />
              </View>
              <Text style={styles.modalErrorImpresionTitle}>Problema con la impresión</Text>
              <Text style={styles.modalErrorImpresionMessage}>
                Ocurrió un problema con la impresión. ¿Desea guardar el comprobante de prueba como archivo?
              </Text>
              <View style={styles.modalErrorImpresionButtons}>
                <TouchableOpacity
                  style={[styles.modalErrorImpresionBtn, styles.modalErrorImpresionBtnNo]}
                  onPress={cerrarModalErrorImpresion}
                  disabled={guardandoPdf}
                >
                  <Text style={styles.modalErrorImpresionBtnTextNo}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalErrorImpresionBtn, styles.modalErrorImpresionBtnSi]}
                  onPress={handleGuardarPdf}
                  disabled={guardandoPdf}
                >
                  {guardandoPdf ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalErrorImpresionBtnTextSi}>Sí</Text>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={modalVisible}
        title={modalData.title}
        message={modalData.message}
        type={modalData.type}
        buttonText={modalData.buttonText}
        onClose={cerrarModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  gradient: {
    flex: 1,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  description: {
    color: colors.darkGray,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  runButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  runButtonDisabled: {
    opacity: 0.7,
  },
  runButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  deviceListSection: {
    marginTop: 20,
  },
  deviceListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 10,
  },
  deviceListScroll: {
    maxHeight: 200,
  },
  deviceItem: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  deviceItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  deviceItemAddress: {
    fontSize: 12,
    color: colors.darkGray,
    marginTop: 4,
  },
  cancelDeviceListButton: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelDeviceListText: {
    fontSize: 14,
    color: colors.darkGray,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
  },
  clearLogButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  clearLogText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  logScroll: {
    maxHeight: 220,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logContent: {
    paddingBottom: 8,
  },
  logLine: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.darkGray,
    marginBottom: 4,
  },
  logSuccess: {
    color: colors.success,
    fontWeight: '500',
  },
  logError: {
    color: colors.error,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalErrorImpresionContainer: {
    width: screenWidth * 0.85,
    maxWidth: 360,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalErrorImpresionGradient: {
    padding: 24,
    alignItems: 'center',
  },
  modalErrorImpresionIcon: {
    marginBottom: 12,
  },
  modalErrorImpresionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalErrorImpresionMessage: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalErrorImpresionButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  modalErrorImpresionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalErrorImpresionBtnNo: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  modalErrorImpresionBtnSi: {
    backgroundColor: '#2BAC6B',
  },
  modalErrorImpresionBtnTextNo: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalErrorImpresionBtnTextSi: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
