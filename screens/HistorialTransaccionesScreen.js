import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';
import { globalStyles } from '../styles/globalStyles';

export default function HistorialTransaccionesScreen() {
  const router = useRouter();
  const { userData } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { modalVisible, modalData, mostrarAdvertencia, mostrarError, cerrarModal } = useCustomModal();
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFin, setShowDatePickerFin] = useState(false);
  const [fechaTemporalInicio, setFechaTemporalInicio] = useState('');
  const [fechaTemporalFin, setFechaTemporalFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [transacciones, setTransacciones] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const cargarTransacciones = async () => {
    if (!fechaInicio || !fechaFin) {
      mostrarAdvertencia('Fechas requeridas', 'Por favor seleccione ambas fechas');
      return [];
    }

    if (fechaInicio > fechaFin) {
      mostrarAdvertencia('Fechas inválidas', 'La fecha de inicio no puede ser mayor a la fecha fin');
      return [];
    }

    try {
      setLoading(true);
      console.log('Consultando historial desde:', format(fechaInicio, 'yyyy-MM-dd'), 'hasta:', format(fechaFin, 'yyyy-MM-dd'));
                
      // Llamar al servicio para obtener las transacciones
      const resultado = await ApiService.obtenerTransacciones({
        fechaInicio,
        fechaFin,
        usuario: userData?.usuario         
      });
      
      return resultado.transacciones || [];
    } catch (error) {
      console.error('Error al consultar historial:', error);
      mostrarError('Error', error.message || 'No se pudo obtener el historial. Por favor intente nuevamente.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleConsultar = async () => {
    const transaccionesObtenidas = await cargarTransacciones();
    setTransacciones(transaccionesObtenidas);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const transaccionesObtenidas = await cargarTransacciones();
    setTransacciones(transaccionesObtenidas);
    setRefreshing(false);
  };

  const onChangeInicio = (event, selectedDate) => {
    const currentDate = selectedDate || fechaInicio;
    setShowDatePickerInicio(Platform.OS === 'ios');
    if (currentDate) {
      setFechaInicio(currentDate);
      if (Platform.OS !== 'web') {
        setFechaTemporalInicio(currentDate.toISOString().split('T')[0]);
      }
    }
  };

  const onChangeFin = (event, selectedDate) => {
    const currentDate = selectedDate || fechaFin;
    setShowDatePickerFin(Platform.OS === 'ios');
    if (currentDate) {
      setFechaFin(currentDate);
      if (Platform.OS !== 'web') {
        setFechaTemporalFin(currentDate.toISOString().split('T')[0]);
      }
    }
  };

  const onChangeFechaInicioWeb = (e) => {
    const selectedDate = e.target.value ? new Date(e.target.value) : new Date();
    setFechaInicio(selectedDate);
    setFechaTemporalInicio(e.target.value);
  };

  const onChangeFechaFinWeb = (e) => {
    const selectedDate = e.target.value ? new Date(e.target.value) : new Date();
    setFechaFin(selectedDate);
    setFechaTemporalFin(e.target.value);
  };

  const showDatepickerInicio = () => {
    if (Platform.OS !== 'web') {
      setShowDatePickerInicio(true);
    }
  };

  const showDatepickerFin = () => {
    if (Platform.OS !== 'web') {
      setShowDatePickerFin(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2B4F8C', '#2BAC6B']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollViewContent, { paddingBottom: Math.max(20, insets.bottom + 16) }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
          >
          <View style={styles.headerWrapper}>
            <View style={[globalStyles.header, { paddingTop: Math.max(insets.top, 20) }]}>
              <View style={globalStyles.headerContent}>
                <TouchableOpacity
                  style={globalStyles.backButton}
                  onPress={() => router.back()}
                >
                  <Text style={globalStyles.backArrow}>‹</Text>
                </TouchableOpacity>
                <View style={globalStyles.headerTitleContainer}>
                  <Text style={globalStyles.headerTitle}>HISTORIAL</Text>
                </View>
                <TouchableOpacity
                  style={globalStyles.menuButton}
                  onPress={() => router.push('/menu')}
                >
                  <Text style={globalStyles.menuIcon}>☰</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={globalStyles.card}>
            <Text style={styles.instruction}>
              {'Seleccione el periodo a consultar'}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Fecha Inicio:</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={fechaTemporalInicio}
                  onChange={onChangeFechaInicioWeb}
                  max={new Date().toISOString().split('T')[0]}
                  style={styles.webDateInput}
                  required
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.dateInput, { width: '100%' }]}
                    onPress={showDatepickerInicio}
                  >
                    <Text style={[styles.dateText, !fechaInicio && { color: '#999' }]}>
                      {fechaInicio ? fechaInicio.toLocaleDateString('es-EC', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }) : 'Seleccione una fecha'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePickerInicio && (
                    <DateTimePicker
                      value={fechaInicio || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onChangeInicio}
                      maximumDate={new Date()}
                      locale="es-EC"
                      themeVariant="light"
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Fecha Fin:</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={fechaTemporalFin}
                  onChange={onChangeFechaFinWeb}
                  min={fechaInicio ? fechaInicio.toISOString().split('T')[0] : ''}
                  max={new Date().toISOString().split('T')[0]}
                  style={styles.webDateInput}
                  required
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.dateInput, { width: '100%' }]}
                    onPress={showDatepickerFin}
                  >
                    <Text style={[styles.dateText, !fechaFin && { color: '#999' }]}>
                      {fechaFin ? fechaFin.toLocaleDateString('es-EC', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }) : 'Seleccione una fecha'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePickerFin && (
                    <DateTimePicker
                      value={fechaFin || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onChangeFin}
                      minimumDate={fechaInicio || new Date()}
                      maximumDate={new Date()}
                      locale="es-EC"
                      themeVariant="light"
                    />
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConsultar}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Consultar</Text>
              )}
            </TouchableOpacity>

            {/* Lista de transacciones */}
            <View style={styles.resultadosContainer}>
              <Text style={styles.resultadosTitulo}>Transacciones encontradas: {transacciones.length}</Text>
              
              {transacciones.length > 0 ? (
                transacciones.map((transaccion, index) => (
                  <View key={index} style={styles.transaccionItem}>
                    <View style={styles.transaccionHeader}>
                      <Text style={styles.transaccionTipo}>{transaccion.tipo || 'Sin tipo'}</Text>
                      <Text style={styles.transaccionMonto}>
                        S/{transaccion.valor ? transaccion.valor.toFixed(2) : '0.00'}
                      </Text>
                    </View>
                    <Text style={styles.transaccionFecha}>
                      {transaccion.fechaSistema ? 
                        new Date(transaccion.fechaSistema).toLocaleString('es-EC') : 
                        'Fecha no disponible'}
                    </Text>
                    <Text style={styles.transaccionCliente}>
                      {transaccion.nombreCliente || 'Socio no especificado'}
                    </Text>
                    <Text style={styles.transaccionCuenta}>
                      {transaccion.identificacionCliente || 'N/A'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.sinResultados}>
                  {loading ? 'Buscando transacciones...' : 'No se encontraron transacciones en el rango de fechas seleccionado'}
                </Text>
              )}
            </View>
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
    flexGrow: 1,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 25,
    marginTop: 40,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },

  headerWrapper: {
    width: '92%',
    alignSelf: 'center',
    paddingBottom: 0,
  },
  instruction: {
    fontSize: 16,
    color: '#2B4F8C',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },


  title: {
    fontSize: 20,
    color: '#2B4F8C',
    marginBottom: 25,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#2B4F8C',
    marginBottom: 5,
    fontWeight: '500',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#2B4F8C',
    borderRadius: 5,
    padding: 12,
    backgroundColor: '#fff',
    height: 50,
    justifyContent: 'center',
  },
  dateText: {
    color: '#2B4F8C',
    fontSize: 16,
    fontWeight: '500',
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
  buttonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    padding: 10,
  },
  webDateInput: {    
    padding: 12,
    borderWidth: 1,
    borderColor: '#2B4F8C',
    borderRadius: 5,
    backgroundColor: '#fff',
    color: '#2B4F8C',
    fontSize: 16,
    marginBottom: 5,
  },
  scrollView: {
    flex: 1,
    width: '100%',
    paddingBottom: 15,
  },
  resultadosContainer: {
    backgroundColor: 'white',
    marginTop: 20,
    borderRadius: 10,
    padding: 15,
    width: '90%',
    alignSelf: 'center',
  },
  resultadosTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B4F8C',
    marginBottom: 15,
    textAlign: 'center',
  },
  transaccionItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2B4F8C',
  },
  transaccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  transaccionTipo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B4F8C',
  },
  transaccionMonto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  transaccionFecha: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 5,
  },
  transaccionCliente: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 3,
  },
  transaccionCuenta: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  sinResultados: {
    textAlign: 'center',
    color: '#6c757d',
    fontStyle: 'italic',
    padding: 20,
  },
});
