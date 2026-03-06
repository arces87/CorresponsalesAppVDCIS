import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';

export default function ObligacionesScreen() {
  const router = useRouter();
  const { checkSessionExpired, setUserData, catalogos, userData, transaccionData } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { modalVisible, modalData, mostrarAdvertencia, mostrarError, cerrarModal } = useCustomModal();
  const [tipoId, setTipoId] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [cliente, setCliente] = useState(null);
  const [obligaciones, setObligaciones] = useState([]);
  const [obligacionesSeleccionadas, setObligacionesSeleccionadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargandoObligaciones, setCargandoObligaciones] = useState(false);
  const [menuLabel, setMenuLabel] = useState('');
  const [menuAccion, setMenuAccion] = useState('');

  const handleContinuar = async () => {
    if (obligacionesSeleccionadas.length === 0) {
      mostrarAdvertencia('Selección requerida', 'Por favor seleccione al menos una obligación');
      return;
    }

    try {
      const obligacionesTransaccion = obligacionesSeleccionadas.map(secuencial =>
        obligaciones.find(c => String(c.secuencial) === secuencial)
      ).filter(Boolean);

      const totalSeleccionado = obligacionesTransaccion.reduce((total, oblig) => total + oblig.saldo, 0);

      // Preparar datos para procesaCuentasPorCobrar
      const cuentasPorCobrar = obligacionesTransaccion.map(oblig => ({
        secuencial: oblig.secuencial,
        valorCobrado: oblig.saldo
      }));

      const transaccionData = {
        obligacionesSeleccionadas: obligacionesSeleccionadas,
        obligacionesTransaccion: obligacionesTransaccion,
        cuentasPorCobrar: cuentasPorCobrar,
        valor: totalSeleccionado,
        nombrecliente: cliente.nombres + ' ' + cliente.apellidos,
        identificacioncliente: cliente.identificacion,
        totalSeleccionado: totalSeleccionado
      };

      setUserData(prevData => ({
        ...prevData,
        ...transaccionData
      }));

      console.log('Obligaciones');
      setLoading(true);
      const saldo = await ApiService.solicitudSaldoCuenta({
        usuario: userData?.usuario
      });
      console.log('Saldo actual:', saldo);
      if (saldo < totalSeleccionado) {
        mostrarAdvertencia('Fondos insuficientes', 'El corresponsal no cuenta con suficiente fondos en su cuenta para realizar la transacción.');
        setLoading(false);
        return;
      }
      // TODO: Obtener comisiones para obligaciones cuando esté disponible
      const comision = 0; // Placeholder hasta que se defina la estructura de comisiones
      router.push({
        pathname: '/otpverificacion',
        params: {
          monto: totalSeleccionado,
          comision: comision,
          total: totalSeleccionado + Number(comision),
          labelTransaccion: menuLabel,
          accionTransaccion: menuAccion,
          identificacionCliente: cliente.identificacion,
          cuentasPorCobrar: cuentasPorCobrar,
          valorAfectado: totalSeleccionado,
          usuario: userData?.usuario,
          otpCliente: false, // TODO: Definir cuando esté disponible
          otpAgente: false // TODO: Definir cuando esté disponible
        }
      });

    } catch (error) {
      console.error('Error en handleContinuar:', error);
      mostrarError('Error', error.message || 'Ocurrió un error al procesar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState('');

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
    console.log('Catálogos en ObligacionesScreen:', catalogos);
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

      // Buscar obligaciones del cliente
      await buscarObligacionesCliente(
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

  const buscarObligacionesCliente = async (
    identificacion,
    estaActiva,
  ) => {
    if (!identificacion) return;

    setCargandoObligaciones(true);
    setObligaciones([]);
    setObligacionesSeleccionadas([]);

    try {
      console.log('Llamando a cuentasPorCobrar con:', {
        identificacion,
        usuario: userData?.usuario
      });

      const resultado = await ApiService.cuentasPorCobrar({
        identificacion,
        usuario: userData?.usuario
      });

      console.log('Cuentas por cobrar encontradas:', resultado);

      // Mapear la respuesta a la estructura esperada por la pantalla
      const obligacionesMapeadas = (resultado.datosClienteRubrosPorCobrar || []).map(item => ({
        secuencial: item.secuencial,
        tipo: item.rubroPorCobrar || 'Sin tipo',
        codigo: String(item.secuencialTipoRubroPorCobrar || item.secuencial),
        saldo: (item.valorPorCobrar) || 0
      }));

      setObligaciones(obligacionesMapeadas);

      // Seleccionar la primera obligación por defecto si hay obligaciones
      if (obligacionesMapeadas.length > 0) {
        setObligacionesSeleccionadas([String(obligacionesMapeadas[0].secuencial)]);
      }
    } catch (error) {
      console.error('Error al buscar obligaciones:', error);
      setError('No se pudieron cargar las obligaciones del socio');
    } finally {
      setCargandoObligaciones(false);
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
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{'DATOS ' + menuLabel}</Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => router.push('/menu')}
            >
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(20, insets.bottom + 16) }]}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
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

              {/* Tabla de Obligaciones */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SELECCIONAR OBLIGACIÓN</Text>
                {cargandoObligaciones ? (
                  <ActivityIndicator size="small" color="#2957a4" style={styles.loadingIndicator} />
                ) : obligaciones.length > 0 ? (
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, styles.tableColumnInfo]}>Información</Text>
                      <Text style={[styles.tableHeaderText, styles.tableColumnSelect]}>Selección</Text>
                    </View>
                    {obligaciones.map((obligacion) => (
                      <TouchableOpacity
                        key={obligacion.secuencial}
                        style={[
                          styles.tableRow,
                          obligacionesSeleccionadas.includes(String(obligacion.secuencial)) && styles.tableRowSelected
                        ]}
                        onPress={() => {
                          const secuencialStr = String(obligacion.secuencial);
                          setObligacionesSeleccionadas(prev =>
                            prev.includes(secuencialStr)
                              ? prev.filter(id => id !== secuencialStr)
                              : [...prev, secuencialStr]
                          );
                        }}
                      >
                        <View style={styles.tableColumnInfo}>
                          <Text style={styles.tableCellText}>                            
                            {obligacion.tipo}
                          </Text>                          
                          <Text style={styles.tableCellText}>
                            <Text style={styles.tableCellLabel}>Valor: </Text>
                              S/{obligacion.saldo.toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.tableColumnSelect}>
                          <View style={[
                            styles.checkbox,
                            obligacionesSeleccionadas.includes(String(obligacion.secuencial)) && styles.checkboxSelected
                          ]}>
                            {obligacionesSeleccionadas.includes(String(obligacion.secuencial)) && (
                              <Text style={styles.checkboxMark}>✓</Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noAccountsText}>No se encontraron obligaciones</Text>
                )}

                {obligacionesSeleccionadas.length > 0 && obligaciones.length > 0 && (
                   <View style={styles.accountDetails}>                     
                     {obligacionesSeleccionadas.map(secuencial => {
                       const obligacion = obligaciones.find(o => String(o.secuencial) === secuencial);
                       return obligacion ? (
                         <Text key={secuencial} style={styles.selectedObligacionText}>
                           {obligacion.tipo} - S/{obligacion.saldo.toFixed(2)}
                         </Text>
                       ) : null;
                     })}
                     <Text style={styles.totalText}>
                       Total a pagar: S/{obligacionesSeleccionadas.reduce((total, secuencial) => {
                         const obligacion = obligaciones.find(o => String(o.secuencial) === secuencial);
                         return total + (obligacion ? obligacion.saldo : 0);
                       }, 0).toFixed(2)}
                     </Text>

                     <TouchableOpacity
                       style={styles.continueButton}
                       onPress={() => handleContinuar()}
                     >
                       <Text style={styles.continueButtonText}>CONTINUAR</Text>
                     </TouchableOpacity>
                   </View>
                 )}
              </View>
            </View>
          )}
          </View>
        </ScrollView>
      </LinearGradient>
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
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
  },
  headerWrapper: {
    width: '92%',
    alignSelf: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 0,
  },
  header: {
    width: '100%',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -20,
    marginRight: -20,
  },
  menuButton: {
    zIndex: 1,
    padding: 10,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    zIndex: 1,
    padding: 10,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 35,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 25,
    marginBottom: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
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
  tableContainer: {
    borderWidth: 1,
    borderColor: '#2B4F8C',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 15,
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
  selectedObligacionText: {
    fontSize: 14,
    color: '#2B4F8C',
    marginBottom: 5,
    paddingLeft: 10,
  },
  totalText: {
    fontSize: 16,
    color: '#2B4F8C',
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
});

