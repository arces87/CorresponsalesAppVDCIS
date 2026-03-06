import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';
import { globalStyles } from '../styles/globalStyles';

export default function DatosTransaccionPrestamoScreen() {
  const router = useRouter();
  const { checkSessionExpired, setUserData, catalogos, userData, transaccionData } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { modalVisible, modalData, mostrarAdvertencia, mostrarError, cerrarModal } = useCustomModal();
  const [tipoId, setTipoId] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [cliente, setCliente] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoPrestamos, setCargandoPrestamos] = useState(false);
  const [valorTransaccion, setValorTransaccion] = useState('');
  const [menuLabel, setMenuLabel] = useState('');
  const [menuAccion, setMenuAccion] = useState('');
  const [valorMaximo, setValorMaximo] = useState(0);
  const [modalAdelantoVisible, setModalAdelantoVisible] = useState(false);
  const [listaCuotasAdelanto, setListaCuotasAdelanto] = useState([]);
  const [cuotasSeleccionadasAdelanto, setCuotasSeleccionadasAdelanto] = useState([]);
  const [cargandoCuotasAdelanto, setCargandoCuotasAdelanto] = useState(false);
  const [valorDesdeAdelanto, setValorDesdeAdelanto] = useState(false);

  const handleContinuar = async (montoAdelanto) => {
    const monto = montoAdelanto != null ? Number(montoAdelanto) : parseFloat(valorTransaccion);
    if (montoAdelanto == null) {
      if (!valorTransaccion) {
        mostrarAdvertencia('Campo requerido', 'Por favor ingrese un valor para la transacción');
        return;
      }
      if (isNaN(monto) || monto <= 0) {
        mostrarAdvertencia('Valor inválido', 'El valor debe ser mayor a cero');
        return;
      }
      if (!valorDesdeAdelanto && monto > valorMaximo) {
        mostrarAdvertencia('Valor excedido', `El valor no puede ser mayor a S/ ${valorMaximo.toFixed(2)}`);
        return;
      }
    } else {
      if (monto <= 0) {
        mostrarAdvertencia('Selección requerida', 'Seleccione al menos una cuota');
        return;
      }
    }

    const valorStr = monto.toFixed(2);
    try {
      const prestamotransaccion = prestamos.find(c => String(c.secuencial) === prestamoSeleccionado);
      const transaccionData = {
        secuencialprestamo: prestamotransaccion.secuencial,
        codigoprestamo: prestamotransaccion.codigo,
        valor: valorStr,
        nombrecliente: cliente.nombres + ' ' + cliente.apellidos,
        identificacioncliente: cliente.identificacion
      };

      setUserData(prevData => ({
        ...prevData,
        ...transaccionData
      }));

      console.log('Prestamos');
      setLoading(true);
      const saldo = await ApiService.solicitudSaldoCuenta({
        usuario: userData?.usuario        
      });
      console.log('Saldo actual:', saldo);
      if (saldo < monto) {
        mostrarAdvertencia('Fondos insuficientes', 'El corresponsal no cuenta con suficiente fondos en su cuenta para realizar la transacción.');
        setLoading(false);
        return;
      } 
      const comision = Number(userData?.comisiones?.abonoPrestamos?.administracionCanal) +
        Number(userData?.comisiones?.abonoPrestamos?.agente) +
        Number(userData?.comisiones?.abonoPrestamos?.cooperativa);
      const accionParaOtp = valorDesdeAdelanto ? 'adelantacuota' : menuAccion;
      router.push({
        pathname: '/otpverificacion',
        params: {
          monto: valorStr,
          comision: comision,
          total: monto + Number(comision),
          labelTransaccion: menuLabel,
          accionTransaccion: accionParaOtp,
          otpCliente: userData?.jsonNegocio?.abonoPrestamos?.validarOtpCliente ?? false,
          otpAgente: userData?.jsonNegocio?.abonoPrestamos?.validarOtpAgente ?? false
        }
      });

    } catch (error) {
      console.error('Error en handleContinuar:', error);
      mostrarError('Error', error.message || 'Ocurrió un error al procesar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const formatFechaVencimiento = (fechaStr) => {
    if (!fechaStr) return '—';
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return fechaStr;
    }
  };

  const handleAdelantaCuota = async () => {
    const prestamoObj = prestamos.find(p => String(p.secuencial) === prestamoSeleccionado);
    if (!prestamoObj) return;
    const secuencialPrestamo = prestamoObj.secuencial;
    setCargandoCuotasAdelanto(true);
    setModalAdelantoVisible(true);
    setListaCuotasAdelanto([]);
    setCuotasSeleccionadasAdelanto([]);
    try {
      const res = await ApiService.informacionCuotas({
        secuencialPrestamo,
        usuario: userData?.usuario
      });
      const lista = res?.listCuotasValorAdelanto ?? res?.listaCuotasValorAdelanto;
      const items = Array.isArray(lista) ? lista : [];
      setListaCuotasAdelanto(items);
    } catch (err) {
      console.error('Error informacionCuotas:', err);
      mostrarError('Error', err.message || 'No se pudo cargar la información de cuotas');
      setModalAdelantoVisible(false);
    } finally {
      setCargandoCuotasAdelanto(false);
    }
  };

  const toggleCuotaAdelanto = (numeroCuota) => {
    const primerNumeroCuota = listaCuotasAdelanto.length > 0
      ? Math.min(...listaCuotasAdelanto.map(c => c.numeroCuota))
      : null;
    setCuotasSeleccionadasAdelanto(prev => {
      const isSelected = prev.includes(numeroCuota);
      if (isSelected) {
        if (prev.length <= 1) return [];
        const min = Math.min(...prev);
        const max = Math.max(...prev);
        // Solo permitir quitar el último (max); si tocan el primero, limpiar toda la selección
        if (numeroCuota === min) return [];
        if (numeroCuota === max) return prev.filter(n => n !== max);
        return prev;
      }
      // Agregar: solo puede iniciar por la primera cuota; luego solo extender hacia adelante (max+1)
      if (prev.length === 0) {
        return numeroCuota === primerNumeroCuota ? [numeroCuota] : prev;
      }
      const max = Math.max(...prev);
      if (numeroCuota === max + 1) return [...prev, numeroCuota].sort((a, b) => a - b);
      return prev;
    });
  };

  const totalAdelanto = listaCuotasAdelanto
    .filter(c => cuotasSeleccionadasAdelanto.includes(c.numeroCuota))
    .reduce((sum, c) => sum + (Number(c.valor) || 0), 0);

  const cerrarModalAdelanto = () => {
    if (cuotasSeleccionadasAdelanto.length > 0) {
      setValorTransaccion(totalAdelanto.toFixed(2));
      setValorDesdeAdelanto(true);
    }
    setModalAdelantoVisible(false);
  };

  const [error, setError] = useState('');

  // Establecer el primer tipo de identificación por defecto al cargar los catálogos
  // Cargar la acción del menú seleccionada
  useEffect(() => {
    const loadMenuAction = async () => {
      try {
        const accion = await AsyncStorage.getItem('selectedMenuAccion');
        const label = await AsyncStorage.getItem('selectedMenuLabel');
        if (accion) {
          setMenuAccion(accion);
        }
        if (label) {
          setMenuLabel(label);
        }
      } catch (error) {
        console.error('Error al cargar la acción del menú:', error);
      }
    };

    loadMenuAction();
  }, []);

  useEffect(() => {
    console.log('Catálogos en BuscarClienteScreen:', catalogos);
    if (catalogos?.tiposIdentificaciones?.length > 0) {
      console.log('Tipos de identificación encontrados:', catalogos.tiposIdentificaciones);
      setTipoId(String(catalogos.tiposIdentificaciones[0].secuencial));
    } else {
      console.log('No se encontraron tipos de identificación en los catálogos');
    }
  }, [catalogos]);

  // Establecer valor límite y valor inicial (valorCancelarHastaCuotaCurso) cuando se selecciona un préstamo
  useEffect(() => {
    setValorDesdeAdelanto(false);
    if (prestamoSeleccionado && prestamos.length > 0) {
      const prestamoSeleccionadoObj = prestamos.find(p => String(p.secuencial) === prestamoSeleccionado);
      if (prestamoSeleccionadoObj) {
        const limite = prestamoSeleccionadoObj.valorCancelarHastaCuotaCurso ?? 0;
        setValorMaximo(limite);
        if (prestamoSeleccionadoObj.valorCancelarHastaCuotaCurso != null) {
          setValorTransaccion(Number(prestamoSeleccionadoObj.valorCancelarHastaCuotaCurso).toFixed(2));
        }
      }
    } else {
      setValorTransaccion('');
      setValorMaximo(0);
    }
  }, [prestamoSeleccionado, prestamos]);

  const handleBuscarCliente = async () => {
    if (!identificacion.trim()) {
      mostrarError('Error', 'Por favor ingrese un número de identificación');
      return;
    }

    if (!tipoId) {
      mostrarError('Error', 'Por favor seleccione un tipo de identificación');
      return;
    }

    setLoading(true);
    setError('');
    setCliente(null);

    try {
      const resultado = await ApiService.buscarCliente({
        identificacion: identificacion.trim(),
        secuencialTipoIdentificacion: parseInt(tipoId, 10),
        usuario: userData?.usuario        
      });

      setCliente(resultado);
      console.log('Cliente encontrado:', resultado);

      // Buscar prestamos del cliente
      await buscarPrestamosCliente(
        resultado.identificacion,        
        true);
    } catch (error) {
      console.error('Error al buscar cliente:', error);
      setError(error.message || 'Error al buscar el socio');
      mostrarError('Error', error.message || 'No se pudo encontrar el socio');
    } finally {
      setLoading(false);
    }
  };

  const buscarPrestamosCliente = async (
    identificacion,
    estaActiva,
  ) => {
    if (!identificacion) return;

    setCargandoPrestamos(true);
    setPrestamos([]);
    setPrestamoSeleccionado('');

    try {
      const resultado = await ApiService.listarPrestamos({
        identificacion,
        estaActiva,
        usuario: userData?.usuario        
      });

      console.log('Prestamos encontrados:', resultado);
      setPrestamos(resultado.informacionPrestamos || []);

      // Seleccionar la primera prestamo por defecto si hay prestamos
      if (resultado.informacionPrestamos?.length > 0) {
        setPrestamoSeleccionado(String(resultado.informacionPrestamos[0].secuencial));
      }
    } catch (error) {
      console.error('Error al buscar prestamos:', error);
      setError('No se pudieron cargar los prestamos del socio');
    } finally {
      setCargandoPrestamos(false);
    }
  };

  const handleLogout = async () => {
    setUserData(null);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('authToken');
    } catch (e) { }
    router.replace('/');
  };

  useEffect(() => {
    if (checkSessionExpired()) {
      mostrarAdvertencia('Sesión expirada', 'Por seguridad, tu sesión ha finalizado.');
      handleLogout();
    }
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2B4F8C', '#2BAC6B']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={[globalStyles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={globalStyles.headerContent}>
            <TouchableOpacity
              style={globalStyles.backButton}
              onPress={() => router.back()}
            >
              <Text style={globalStyles.backArrow}>‹</Text>
            </TouchableOpacity>
            <View style={globalStyles.headerTitleContainer}>
              <Text style={globalStyles.headerTitle}>{'DATOS ' + menuLabel}</Text>
            </View>
            <TouchableOpacity
              style={globalStyles.menuButton}
              onPress={() => router.push('/menu')}
            >
              <Text style={globalStyles.menuIcon}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollViewContent, { paddingBottom: Math.max(20, insets.bottom + 16) }]}
          showsVerticalScrollIndicator={true}
        >
        <View style={globalStyles.card}>
          <Text style={styles.instruction}>
            {'Seleccione los datos de la transacción'}
          </Text>
          <Text style={styles.label}>Tipo de Identificación</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={tipoId}
              onValueChange={setTipoId}
              style={styles.picker}
              dropdownIconColor="#000"
            >
              {catalogos?.tiposIdentificaciones?.map((tipo) => (
                <Picker.Item
                  key={tipo.secuencial}
                  label={tipo.nombre}
                  value={String(tipo.secuencial)}
                />
              ))}
            </Picker>
          </View>
          <Text style={styles.label}>Identificación:</Text>
          <TextInput
            style={styles.input}
            value={identificacion}
            onChangeText={setIdentificacion}
            placeholder="Ingrese el número de identificación"
            keyboardType="numeric"
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleBuscarCliente}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>BUSCAR SOCIO</Text>
            )}
          </TouchableOpacity>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {cliente && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Datos del Socio</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Nombres:</Text>
                <Text style={styles.resultValue}>{cliente.nombres || 'No disponible'}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Apellidos:</Text>
                <Text style={styles.resultValue}>{cliente.apellidos || 'No disponible'}</Text>
              </View>
              {cliente.telefono && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Teléfono:</Text>
                  <Text style={styles.resultValue}>{cliente.telefono}</Text>
                </View>
              )}
              {cliente.correoElectronico && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Correo:</Text>
                  <Text style={styles.resultValue}>{cliente.correoElectronico}</Text>
                </View>
              )}

              {/* Lista de Préstamos */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SELECCIONAR PRÉSTAMO</Text>
                {cargandoPrestamos ? (
                  <ActivityIndicator size="small" color="#2957a4" style={styles.loadingIndicator} />
                ) : prestamos.length > 0 ? (
                  <View style={styles.loansListContainer}>
                    {prestamos.map((prestamo) => {
                      const isSelected = String(prestamo.secuencial) === prestamoSeleccionado;
                      return (
                        <TouchableOpacity
                          key={prestamo.secuencial}
                          style={[styles.loanListItem, isSelected && styles.loanListItemSelected]}
                          onPress={() => setPrestamoSeleccionado(String(prestamo.secuencial))}
                          activeOpacity={0.7}
                        >
                          <View style={styles.loanListItemHeader}>
                            <Text style={[styles.loanListCode, isSelected && styles.loanListItemSelectedText]}>
                              {prestamo.codigo || '—'}
                            </Text>
                            <Text style={[styles.loanListBadge, isSelected && styles.loanListItemSelectedText]}>
                              {prestamo.tipo || ''}
                            </Text>
                          </View>
                          <View style={styles.loanListItemRow}>
                            <Text style={styles.loanListLabel}>Valor para estar al día: </Text>
                            <Text style={[styles.loanListValue, isSelected && styles.loanListItemSelectedText]}>
                              S/{prestamo.valorParaEstarAlDia != null
                                ? Number(prestamo.valorParaEstarAlDia).toFixed(2)
                                : '0.00'}
                            </Text>
                          </View>
                          <View style={styles.loanListItemRow}>
                            <Text style={styles.loanListLabel}>Cuota a cancelar: </Text>
                            <Text style={[styles.loanListValue, isSelected && styles.loanListItemSelectedText]}>
                              S/{prestamo.valorCancelarHastaCuotaCurso != null
                                ? Number(prestamo.valorCancelarHastaCuotaCurso).toFixed(2)
                                : '0.00'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noAccountsText}>No se encontraron préstamos</Text>
                )}

                {prestamoSeleccionado && prestamos.length > 0 && (() => {
                  const prestamoObj = prestamos.find(p => String(p.secuencial) === prestamoSeleccionado);
                  const esValorLimiteCero = prestamoObj ? (Number(prestamoObj.valorCancelarHastaCuotaCurso) === 0) : false;
                  return (
                  <View style={styles.accountDetails}>
                    <View style={styles.inputContainer}>
                      {esValorLimiteCero && (
                        <TouchableOpacity
                          style={[styles.continueButton, styles.continueButtonAdelanto]}
                          onPress={() => handleAdelantaCuota()}
                        >
                          <Text style={styles.continueButtonText}>ADELANTA CUOTA</Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.label}>Valor de la transacción</Text>
                      <View style={[styles.currencyInputContainer, esValorLimiteCero && styles.inputDisabled]}>
                        <Text style={styles.currencySymbol}>S/</Text>
                        <TextInput
                          style={styles.currencyInput}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor="#999"
                          value={valorTransaccion}
                          editable={!esValorLimiteCero}
                          onChangeText={(text) => {
                            if (esValorLimiteCero) return;
                            setValorDesdeAdelanto(false);
                            // Allow only numbers and one decimal point
                            const regex = /^\d*\.?\d{0,2}$/;
                            if (regex.test(text)) {
                              if (text === '') {
                                setValorTransaccion('');
                                return;
                              }
                              
                              const valorNumerico = parseFloat(text);
                              
                              // Validar que el valor sea mayor a cero
                              if (valorNumerico <= 0) {
                                // No permitir valores menores o iguales a cero
                                return;
                              }
                              
                              // Validar que el valor no sea mayor al máximo
                              if (valorNumerico > valorMaximo) {
                                // Si es mayor al máximo, establecer el máximo
                                setValorTransaccion(valorMaximo.toFixed(2));
                              } else {
                                // Valor válido, permitir el cambio
                                setValorTransaccion(text);
                              }
                            }
                          }}
                        />
                      </View>

                      <TouchableOpacity
                        style={[styles.continueButton, !valorTransaccion && styles.continueButtonDisabled]}
                        disabled={!valorTransaccion}
                        onPress={() => handleContinuar()}
                      >
                        <Text style={styles.continueButtonText}>CONTINUAR</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  );
                })()}
              </View>
            </View>
          )}
        </View>
        </ScrollView>
      </LinearGradient>

      <Modal
        visible={modalAdelantoVisible}
        transparent
        animationType="fade"
        onRequestClose={cerrarModalAdelanto}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalAdelantoContent}>
            <View style={styles.modalAdelantoHeader}>
              <Text style={styles.modalAdelantoTitle}>Seleccionar cuotas a adelantar</Text>
              <TouchableOpacity
                style={styles.modalAdelantoClose}
                onPress={cerrarModalAdelanto}
              >
                <Text style={styles.modalAdelantoCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {cargandoCuotasAdelanto ? (
              <View style={styles.modalAdelantoBody}>
                <ActivityIndicator size="large" color="#2B4F8C" />
                <Text style={styles.modalAdelantoLoadingText}>Cargando cuotas...</Text>
              </View>
            ) : listaCuotasAdelanto.length === 0 ? (
              <View style={styles.modalAdelantoBody}>
                <Text style={styles.noAccountsText}>No hay cuotas disponibles</Text>
              </View>
            ) : (
              <>
                <ScrollView
                  style={styles.modalAdelantoScroll}
                  contentContainerStyle={styles.modalAdelantoScrollContent}
                  showsVerticalScrollIndicator
                >
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, styles.tableColumnInfo]}>Información</Text>
                      <Text style={[styles.tableHeaderText, styles.tableColumnSelect]}>Selección</Text>
                    </View>
                    {listaCuotasAdelanto.map((cuota) => {
                      const isSelected = cuotasSeleccionadasAdelanto.includes(cuota.numeroCuota);
                      return (
                        <TouchableOpacity
                          key={cuota.numeroCuota}
                          style={[styles.tableRow, isSelected && styles.tableRowSelected]}
                          onPress={() => toggleCuotaAdelanto(cuota.numeroCuota)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.tableColumnInfo}>
                            <Text style={styles.tableCellText}>Cuota {cuota.numeroCuota}</Text>
                            <Text style={styles.tableCellText}>
                              <Text style={styles.tableCellLabel}>Valor: </Text>
                              S/{Number(cuota.valor).toFixed(2)}
                            </Text>
                            <Text style={styles.tableCellText}>
                              <Text style={styles.tableCellLabel}>Vence: </Text>
                              {formatFechaVencimiento(cuota.fechaVencimiento)}
                            </Text>
                          </View>
                          <View style={styles.tableColumnSelect}>
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                              {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
                <View style={styles.modalAdelantoFooter}>
                  <Text style={styles.totalText}>
                    Total: S/{totalAdelanto.toFixed(2)}
                  </Text>
                </View>
              </>
            )}
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
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerWrapper: {
    width: '92%',
    alignSelf: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 0,
  },
  instruction: {
    fontSize: 16,
    color: '#2B4F8C',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    color: '#2B4F8C',
    marginTop: 10,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#2B4F8C',
    borderRadius: 0,
    padding: 8,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: 'transparent',
    color: '#2B4F8C',
    width: '100%',
  },
  disabledInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#2B4F8C',
    borderRadius: 0,
    padding: 8,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  disabledText: {
    color: '#2B4F8C',
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2B4F8C',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 25,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  errorText: {
    color: '#ff4444',
    marginTop: 10,
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  resultTitle: {
    fontSize: 16,
    color: '#2B4F8C',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  resultRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  resultLabel: {
    fontWeight: 'bold',
    color: '#495057',
    width: 120,
  },
  resultValue: {
    flex: 1,
    color: '#212529',
  },
  section: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#2B4F8C',
    marginTop: 10,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    padding: 10,
  },
  noAccountsText: {
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalAdelantoContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalAdelantoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
  },
  modalAdelantoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B4F8C',
    flex: 1,
  },
  modalAdelantoClose: {
    padding: 4,
  },
  modalAdelantoCloseText: {
    fontSize: 22,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  modalAdelantoBody: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  modalAdelantoLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6c757d',
  },
  modalAdelantoScroll: {
    maxHeight: 340,
  },
  modalAdelantoScrollContent: {
    padding: 15,
    paddingBottom: 10,
  },
  modalAdelantoFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#2B4F8C',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2B4F8C',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  tableHeaderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableColumnInfo: {
    flex: 3,
  },
  tableColumnSelect: {
    flex: 1,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  tableRowSelected: {
    backgroundColor: '#e3f2fd',
  },
  tableCellText: {
    fontSize: 14,
    color: '#2B4F8C',
    marginBottom: 2,
  },
  tableCellLabel: {
    fontWeight: 'bold',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2B4F8C',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#2B4F8C',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalText: {
    fontSize: 16,
    color: '#2B4F8C',
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 12,
  },
  accountDetails: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 5,
  },
  accountDetailText: {
    fontSize: 16,
    color: '#2B4F8C',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginTop: 10,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B4F8C',
    borderRadius: 5,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#e9ecef',
    opacity: 0.8,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#2B4F8C',
    marginRight: 5,
    fontWeight: 'bold',
  },
  currencyInput: {
    flex: 1,
    height: '100%',
    fontSize: 18,
    color: '#2B4F8C',
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    color: '#2B4F8C',
    marginBottom: 5,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#2B4F8C',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  continueButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  continueButtonAdelanto: {
    marginTop: 0,
    marginBottom: 20,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loansListContainer: {
    marginBottom: 10,
  },
  loanListItem: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
  },
  loanListItemSelected: {
    borderColor: '#2B4F8C',
    backgroundColor: '#E8EEF7',
  },
  loanListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  loanListCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B4F8C',
  },
  loanListBadge: {
    fontSize: 13,
    color: '#495057',
  },
  loanListItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  loanListLabel: {
    fontSize: 13,
    color: '#6c757d',
    marginRight: 4,
  },
  loanListValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  loanListItemSelectedText: {
    color: '#2B4F8C',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#2B4F8C',
    borderRadius: 5,
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 40,
    width: '100%',
    color: '#2B4F8C',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});
