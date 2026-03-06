import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';
import { globalStyles } from '../styles/globalStyles';

export default function DatosTransaccionScreen() {
  const router = useRouter();
  const { checkSessionExpired, setUserData, catalogos, userData, transaccionData } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { modalVisible, modalData, mostrarAdvertencia, mostrarError, cerrarModal } = useCustomModal();
  const [tipoId, setTipoId] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [cliente, setCliente] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoCuentas, setCargandoCuentas] = useState(false);
  const [valorTransaccion, setValorTransaccion] = useState('');
  const [observacionDeposito, setObservacionDeposito] = useState('');
  const [menuLabel, setMenuLabel] = useState('');
  const [menuAccion, setMenuAccion] = useState('');

  const handleContinuar = async () => {
    if (!valorTransaccion) {
      mostrarAdvertencia('Campo requerido', 'Por favor ingrese un valor para la transacción');
      return;
    }

    try {
      const cuentatransaccion = cuentas.find(c => String(c.secuencialCuenta) === cuentaSeleccionada);
      const transaccionData = {
        numerocuentacliente: cuentatransaccion.codigo,
        tipocuenta: cuentatransaccion.tipoCuentaNombre,
        secuencialcuenta: cuentatransaccion.secuencialCuenta,
        tipoRegistroFirma: cuentatransaccion.tipoRegistroFirma,
        valor: valorTransaccion,
        nombrecliente: cliente.nombres + ' ' + cliente.apellidos,
        identificacioncliente: cliente.identificacion
      };
      if (menuAccion === 'deposito') {
        transaccionData.observacionDeposito = (observacionDeposito || '').trim();
      }

      setUserData(prevData => ({
        ...prevData,
        ...transaccionData
      }));

      if (menuAccion === 'retiro') {
        console.log('Retiro');
        const disponible = cuentatransaccion.disponibleParaTransaccion?.toFixed(2);
                
        if (Number(valorTransaccion) > Number(disponible)) {
          mostrarAdvertencia('Fondos insuficientes', 'El valor a retirar es mayor al disponible en la cuenta del socio');
          setLoading(false);
          return;
        }
        
        setLoading(true);
        const response = await ApiService.listarTiposTransacciones({
          usuario: userData?.usuario          
        });        
       
        if (typeof response === 'object' && response !== null) {
          console.log('Tipos de transacciones:', response);
          if(response.saldoCaja < Number(valorTransaccion)) {
            mostrarAdvertencia('Saldo insuficiente', 'El saldo en caja es menor al valor de la transacción.');
            setLoading(false);
            return;
          }
        } else {          
          mostrarError('Error', 'Error al obtener el saldo en caja. Por favor intente nuevamente.');
          setLoading(false);
          return;
        } 
        const comision = Number(userData?.comisiones?.retiro?.administracionCanal) +
          Number(userData?.comisiones?.retiro?.agente) +
          Number(userData?.comisiones?.retiro?.cooperativa);
        router.push({
          pathname: '/otpverificacion',
          params: {
            monto: valorTransaccion,
            comision: comision,
            total: Number(valorTransaccion) + Number(comision),
            labelTransaccion: menuLabel,
            accionTransaccion: menuAccion,
            otpCliente: userData?.jsonNegocio?.retiro?.validarOtpCliente ?? false,
            otpAgente: userData?.jsonNegocio?.retiro?.validarOtpAgente ?? false
          }
        });
      }

      if (menuAccion === 'deposito') {
        console.log('Depósito');
        /* setLoading(true);
        const saldo = await ApiService.solicitudSaldoCuenta({
          usuario: userData?.usuario          
        });
        console.log('Saldo actual:', saldo);
        if (saldo < Number(valorTransaccion)) {
          mostrarAdvertencia('Fondos insuficientes', 'El corresponsal no cuenta con suficiente fondos en su cuenta para realizar la transacción.');
          setLoading(false);
          return;
        } */
        const comision = Number(userData?.comisiones?.deposito?.administracionCanal) +
          Number(userData?.comisiones?.deposito?.agente) +
          Number(userData?.comisiones?.deposito?.cooperativa);
        router.push({
          pathname: '/otpverificacion',
          params: {
            monto: valorTransaccion,
            comision: comision,
            total: Number(valorTransaccion) + Number(comision),
            labelTransaccion: menuLabel,
            accionTransaccion: menuAccion,
            otpCliente: userData?.jsonNegocio?.deposito?.validarOtpCliente ?? false,
            otpAgente: userData?.jsonNegocio?.deposito?.validarOtpAgente ?? false
          }
        });
      }

    } catch (error) {
      console.error('Error en handleContinuar:', error);
      mostrarError('Error', error.message || 'Ocurrió un error al procesar la transacción');
    } finally {
      setLoading(false);
    }
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

      // Buscar cuentas del cliente
      await buscarCuentasCliente(
        resultado.identificacion,
        resultado.secuencialTipoIdentificacion,
        resultado.numeroCliente,
        resultado.secuencialEmpresa,
        menuAccion === 'deposito');
    } catch (error) {
      console.error('Error al buscar cliente:', error);
      setError(error.message || 'Error al buscar el socio');
      mostrarError('Error', error.message || 'No se pudo encontrar el socio');
    } finally {
      setLoading(false);
    }
  };

  const buscarCuentasCliente = async (
    identificacion,
    secuencialTipoIdentificacion,
    numeroCliente,
    secuencialEmpresa,
    esParaDeposito = false
  ) => {
    if (!identificacion || !secuencialTipoIdentificacion) return;

    setCargandoCuentas(true);
    setCuentas([]);
    setCuentaSeleccionada('');

    try {
      const resultado = await ApiService.buscarCuentas({
        identificacion,
        secuencialTipoIdentificacion,
        numeroCliente,
        secuencialEmpresa,
        usuario: userData?.usuario,
        esParaDeposito
      });

      console.log('Cuentas encontradas:', resultado);
      setCuentas(resultado.cuentaDetallesConsolidado || []);

      // Seleccionar la primera cuenta por defecto si hay cuentas
      if (resultado.cuentaDetallesConsolidado?.length > 0) {
        setCuentaSeleccionada(String(resultado.cuentaDetallesConsolidado[0].secuencialCuenta));
      }
    } catch (error) {
      console.error('Error al buscar cuentas:', error);
      setError('No se pudieron cargar las cuentas del socio');
    } finally {
      setCargandoCuentas(false);
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
    <SafeAreaView style={styles.container}>
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
        <KeyboardAvoidingView style={{ flex: 1, width: '100%' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={[styles.scrollViewContent, { paddingBottom: Math.max(20, insets.bottom + 16) }]} keyboardShouldPersistTaps="handled">
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
                    <Text style={styles.resultLabel}>Nombre: </Text>
                    <Text style={styles.resultValue}>{cliente.nombres + cliente.apellidos || 'No disponible'}</Text>
                  </View>
                  {cliente.telefono && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Teléfono: </Text>
                      <Text style={styles.resultValue}>{cliente.telefono}</Text>
                    </View>
                  )}
                  {cliente.correoElectronico && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Correo: </Text>
                      <Text style={styles.resultValue}>{cliente.correoElectronico}</Text>
                    </View>
                  )}

                  {/* Lista de Cuentas */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SELECCIONAR CUENTA</Text>
                    {cargandoCuentas ? (
                      <ActivityIndicator size="small" color="#2957a4" style={styles.loadingIndicator} />
                    ) : cuentas.length > 0 ? (
                      <View style={styles.accountsListContainer}>
                        {cuentas.map((cuenta) => {
                          const isSelected = String(cuenta.secuencialCuenta) === cuentaSeleccionada;
                          return (
                            <TouchableOpacity
                              key={cuenta.secuencialCuenta}
                              style={[styles.accountListItem, isSelected && styles.accountListItemSelected]}
                              onPress={() => setCuentaSeleccionada(String(cuenta.secuencialCuenta))}
                              activeOpacity={0.7}
                            >
                              <View style={styles.accountListItemHeader}>
                                <Text style={[styles.accountListCode, isSelected && styles.accountListItemSelectedText]}>
                                  {cuenta.codigo || '—'}
                                </Text>
                                <Text style={[styles.accountListBadge, isSelected && styles.accountListItemSelectedText]}>
                                  {cuenta.tipoCuentaNombre || ''} · {cuenta.monedaNombre || ''}
                                </Text>
                              </View>
                              {cuenta.tipoRegistroFirma != null && cuenta.tipoRegistroFirma !== '' && (
                                <View style={styles.accountListItemRow}>
                                  <Text style={styles.accountListLabel}>Registro: </Text>
                                  <Text style={[styles.accountListValue, isSelected && styles.accountListItemSelectedText]}>
                                    {cuenta.tipoRegistroFirma}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.noAccountsText}>No se encontraron cuentas</Text>
                    )}

                    {cuentaSeleccionada && cuentas.length > 0 && (
                      <View style={styles.accountDetails}>
                        
                        {/*<Text style={styles.accountDetailText}>
                          Saldo disponible: S/{cuentas.find(c => String(c.secuencialCuenta) === cuentaSeleccionada)?.disponibleParaTransaccion?.toFixed(2) || '0.00'}
                        </Text>*/}
                        
                        {menuAccion === 'deposito' && (
                          <View style={styles.inputContainer}>
                            <Text style={styles.label}>Observación (opcional)</Text>
                            <TextInput
                              style={styles.observacionInput}
                              placeholder="Ej: Jairo Maldonado Rivas"
                              placeholderTextColor="#999"
                              value={observacionDeposito}
                              onChangeText={setObservacionDeposito}
                              multiline
                              numberOfLines={2}
                              maxLength={200}
                            />
                          </View>
                        )}
                        
                        <View style={styles.inputContainer}>
                          <Text style={styles.label}>Valor de la transacción</Text>
                          <View style={styles.currencyInputContainer}>
                            <Text style={styles.currencySymbol}>S/</Text>
                            <TextInput
                              style={styles.currencyInput}
                              keyboardType="numeric"
                              placeholder="0.00"
                              placeholderTextColor="#999"
                              value={valorTransaccion}
                              onChangeText={(text) => {
                                // Allow only numbers and one decimal point
                                const regex = /^\d*\.?\d{0,2}$/;
                                if (text === '' || regex.test(text)) {
                                  setValorTransaccion(text);
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
                    )}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
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
  scrollViewContent: {
    width: '100%',
    flexGrow: 1,
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
    borderRadius: 5,
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
  observacionInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    minHeight: 72,
    textAlignVertical: 'top',
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
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  accountsListContainer: {
    marginBottom: 10,
  },
  accountListItem: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
  },
  accountListItemSelected: {
    borderColor: '#2B4F8C',
    backgroundColor: '#E8EEF7',
  },
  accountListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  accountListCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B4F8C',
  },
  accountListBadge: {
    fontSize: 13,
    color: '#495057',
  },
  accountListItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  accountListLabel: {
    fontSize: 13,
    color: '#6c757d',
    marginRight: 4,
  },
  accountListValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  accountListItemSelectedText: {
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
});
