import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';
import { globalStyles } from '../styles/globalStyles';

export default function CrearCuentaScreen() {
  const router = useRouter();
  const { userData, catalogos } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { modalVisible, modalData, mostrarAdvertencia, mostrarError, mostrarExito, cerrarModal } = useCustomModal();
  const [tipoId, setTipoId] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('');
  const [montoApertura, setMontoApertura] = useState('');
  const [cuentasDisponibles, setCuentasDisponibles] = useState([]);
  const [cargandoCuentas, setCargandoCuentas] = useState(false);
  const [errorTiposCuenta, setErrorTiposCuenta] = useState('');

  // Buscar tipos de cuentas disponibles para el cliente
  const buscarTipoCuentas = async (secuencialCliente, secuencialEmpresa) => {
    try {
      setCargandoCuentas(true);
      setError('');
      
      const tiposCuenta = await ApiService.buscarTipoCuenta({
        secuencialCliente,
        secuencialEmpresa: 1,
        codigoProductoVista: '12',        
        usuario: userData?.usuario
      });
      
      console.log('Tipos de cuenta encontrados:', tiposCuenta);
      
      // Verificar si hay un error en la respuesta
      const cuentaError = tiposCuenta?.find(cuenta => cuenta.codigo === 'ERROR');
      if (cuentaError) {
        setErrorTiposCuenta(cuentaError.nombre || 'Error al cargar los tipos de cuenta');
        setCuentasDisponibles([]);
        setTipoCuenta('');
        setMontoApertura('');
        return tiposCuenta;
      }
      
      // Si no hay error, procesar normalmente
      setErrorTiposCuenta('');
      setCuentasDisponibles(tiposCuenta || []);
      
      // Seleccionar el primer tipo de cuenta por defecto si hay opciones disponibles
      if (tiposCuenta?.length > 0) {
        setTipoCuenta(String(tiposCuenta[0].codigo));
        setMontoApertura(String(tiposCuenta[0].valorApertura || '0'));
      }
      
      return tiposCuenta;
    } catch (error) {
      console.error('Error al buscar tipos de cuenta:', error);
      setError(error.message || 'Error al cargar los tipos de cuenta');
      setErrorTiposCuenta(error.message || 'Error al cargar los tipos de cuenta');
      setCuentasDisponibles([]);
      setTipoCuenta('');
      setMontoApertura('');
      throw error;
    } finally {
      setCargandoCuentas(false);
    }
  };

  // Cargar tipos de identificación
  useEffect(() => {
    console.log('Catálogos en CrearCuentaScreen:', catalogos);
    if (catalogos?.tiposIdentificaciones?.length > 0) {
      console.log('Tipos de identificación encontrados:', catalogos.tiposIdentificaciones);
      const firstTipoId = String(catalogos.tiposIdentificaciones[0].secuencial);
      console.log('Estableciendo tipoId inicial a:', firstTipoId);
      setTipoId(firstTipoId);
    } else {
      console.log('No se encontraron tipos de identificación en los catálogos');
      setTipoId('');
    }
  }, [catalogos]);

  const handleBuscarCliente = async () => {
      if (!identificacion.trim()) {
        mostrarAdvertencia('Campo requerido', 'Por favor ingrese un número de identificación');
        return;
      }
  
      if (!tipoId) {
        mostrarAdvertencia('Campo requerido', 'Por favor seleccione un tipo de identificación');
        return;
      }
  
      setLoading(true);
      setError('');
      setCliente(null);

      console.log('Tipo de identificación seleccionado:', tipoId);
  
      try {
        const resultado = await ApiService.buscarCliente({
          identificacion: identificacion.trim(),
          secuencialTipoIdentificacion: parseInt(tipoId),          
          usuario: userData?.usuario          
        });
        
        setCliente(resultado);
        console.log('Cliente encontrado:', resultado);
        
        // Buscar tipos de cuentas disponibles
        await buscarTipoCuentas(
          resultado.secuencialCliente,
          resultado.secuencialEmpresa);
      } catch (error) {
        console.error('Error al buscar cliente:', error);
        setError(error.message || 'Error al buscar el socio');
        mostrarError('Error', error.message || 'No se pudo encontrar el socio');
      } finally {
        setLoading(false);
      }
    };

  const  handleCrearCuenta = async () => {
    if (!tipoCuenta) {
      mostrarAdvertencia('Campo requerido', 'Por favor seleccione un tipo de cuenta');
      return;
    }

    if (!cliente?.secuencialCliente) {
      mostrarError('Error', 'No se encontró la información del socio');
      return;
    }    

    setLoading(true);
    console.log('Datos para crear cuenta:', {
      tipoCuenta,
      cliente,
      userData
    });
    try {
      const response = await ApiService.crearCuenta({
        codigoTipoCuenta: tipoCuenta,
        secuencialCliente: cliente.secuencialCliente,
        usuario: userData?.usuario,             
      });

      console.log('Respuesta de crearCuenta:', response);

      if (response.cuentasCreadas?.length > 0) {
        const cuentaCreada = response.cuentasCreadas[0];
        mostrarExito(
          'Cuenta creada',
          `Cuenta creada exitosamente\n\nNúmero: ${cuentaCreada.codigoCuenta}\nTipo: ${cuentaCreada.tipoCuentaNombre}`
        );
        // Esperar un momento antes de navegar para que el usuario vea el mensaje de éxito
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        throw new Error('No se pudo crear la cuenta');
      }
    } catch (error) {
      console.error('Error creando cuenta:', error);
      mostrarError('Error', error.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2B4F8C', '#2BAC6B']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={styles.headerWrapper}>
          <View style={[globalStyles.header, { paddingTop: Math.max(insets.top, 20) }]}>
            <View style={globalStyles.headerContent}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={globalStyles.backButton}
              >
                <Text style={globalStyles.backArrow}>‹</Text>
              </TouchableOpacity>
              <View style={globalStyles.headerTitleContainer}>
                <Text style={globalStyles.headerTitle}>CREAR CUENTA</Text>
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

        <View style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tipo de Identificación *</Text>
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
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Identificación:</Text>
              <TextInput
                style={styles.input}
                value={identificacion}
                onChangeText={setIdentificacion}
                placeholder="Ingrese el número de identificación"
                keyboardType="numeric"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.searchButton, loading && styles.buttonDisabled]}
              onPress={handleBuscarCliente}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>BUSCAR SOCIO</Text>
              )}
            </TouchableOpacity>

            {cliente && (
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>
                  {cliente.nombres} {cliente.apellidos}
                </Text>
                <Text style={styles.clientId}>
                  {cliente.identificacion}
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tipo de Cuenta *</Text>
                  {errorTiposCuenta ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{errorTiposCuenta}</Text>
                    </View>
                  ) : (
                    <View style={styles.pickerContainer}>
                      {cargandoCuentas ? (
                        <ActivityIndicator size="small" color="#2957a4" style={styles.loadingIndicator} />
                      ) : (
                        <Picker
                          selectedValue={tipoCuenta}
                          onValueChange={setTipoCuenta}
                          style={styles.picker}
                          dropdownIconColor="#000"
                          enabled={!errorTiposCuenta && cuentasDisponibles.length > 0}
                        >                      
                          {cuentasDisponibles.map((cuenta) => (
                            <Picker.Item
                              key={cuenta.codigo}
                              label={cuenta.nombre}
                              value={String(cuenta.codigo)}
                            />
                          ))}
                        </Picker>
                      )}
                    </View>
                  )}
                </View>                

                <TouchableOpacity
                  style={[
                    styles.button, 
                    styles.continueButton,
                    (loading || !tipoCuenta || errorTiposCuenta || cuentasDisponibles.length === 0) && styles.buttonDisabled
                  ]}
                  onPress={handleCrearCuenta}
                  disabled={loading || !tipoCuenta || errorTiposCuenta || cuentasDisponibles.length === 0}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>CREAR CUENTA</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
  headerWrapper: {
    width: '92%',
    alignSelf: 'center',
    paddingBottom: 0,
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#2B4F8C',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#2B4F8C',
    borderRadius: 0,
    padding: 8,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
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
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  searchButton: {
    backgroundColor: '#2B4F8C',
    marginTop: 20,
  },
  continueButton: {
    backgroundColor: '#2B4F8C',
    marginTop: 30,
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
  errorContainer: {
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#f44336',
    marginBottom: 15,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingIndicator: {
    padding: 10,
  },
  clientInfo: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  clientId: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});
