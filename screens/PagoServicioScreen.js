import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';
import { globalStyles } from '../styles/globalStyles';

export default function PagoServicioScreen() {
  const router = useRouter();
  const { checkSessionExpired, setUserData, catalogos, userData } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { modalVisible, modalData, mostrarError, mostrarAdvertencia, mostrarInfo, cerrarModal } = useCustomModal();
  const [numeroContrato, setNumeroContrato] = useState('');
  const [identificacionTitular, setIdentificacionTitular] = useState('');
  const [correoTitular, setCorreoTitular] = useState('');
  const [loading, setLoading] = useState(false);
  const [valorTransaccion, setValorTransaccion] = useState('');
  const [menuLabel, setMenuLabel] = useState('');
  const [menuAccion, setMenuAccion] = useState('');
  const [textoBusquedaServicio, setTextoBusquedaServicio] = useState('');
  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState('');
  const [cargandoDetalles, setCargandoDetalles] = useState(false);
  const [detallesServicio, setDetallesServicio] = useState(null);
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false);
  const [recibos, setRecibos] = useState([]);
  const [cargandoRecibos, setCargandoRecibos] = useState(false);
  const [reciboSeleccionado, setReciboSeleccionado] = useState('');
  const [esDetalleRecibo, setEsDetalleRecibo] = useState(false);
  // Estructura para almacenar temporalmente los recibos con sus detalles
  const [recibosConDetalles, setRecibosConDetalles] = useState(new Map());

  const handleContinuar = async () => {
    if (!servicioSeleccionado) {
      mostrarError('Error', 'Por favor seleccione un servicio');
      return;
    }

    if (!numeroContrato) {
      mostrarError('Error', 'Por favor ingrese el número de contrato o cuenta');
      return;
    }

    setLoading(true);
    try {
      const reciboData = reciboSeleccionado ? recibosConDetalles.get(reciboSeleccionado) : null;
      
      // Obtener el valor del recibo seleccionado
      let valorDelRecibo = null;
      if (reciboData) {
        // Intentar obtener el monto desde importes
        if (reciboData.importes && Array.isArray(reciboData.importes) && reciboData.importes.length > 0) {
          const totalImportes = reciboData.importes.reduce((sum, imp) => {
            const valor = imp.valorImporte?.monto || imp.monto || imp.valor || 0;
            return sum + Number(valor);
          }, 0);
          valorDelRecibo = totalImportes > 0 ? totalImportes : null;
        }
        // Si no hay importes, intentar obtener desde propiedades directas
        if (!valorDelRecibo) {
          valorDelRecibo = reciboData.monto || reciboData.valor || null;
        }
      }
      
      // Si no hay recibo o no se pudo obtener el valor, mostrar error
      if (!valorDelRecibo) {
        mostrarError('Error', 'No se pudo obtener el valor del recibo. Por favor, seleccione un recibo válido.');
        setLoading(false);
        return;
      }
      
      // Buscar el servicio seleccionado en el array de servicios para obtener proveedorServicio (nombre)
      const servicioObj = servicios.find(s => 
        s.id === servicioSeleccionado || 
        String(s.id) === String(servicioSeleccionado)
      );
      const proveedorServicio = servicioObj?.nombre || null;
      
      const nombreTitular = reciboData?.titularCuenta || null;

      setUserData(prevData => {
        return {
        ...prevData,
          idservicio: servicioSeleccionado,
          proveedorsevicio: proveedorServicio,
          recibo: reciboData || null,        
          referencia: numeroContrato,          
          valorafectado: parseFloat(valorDelRecibo),          
          identificaciontitular: identificacionTitular || null,
          correotitular: correoTitular || null,
          identificacioncliente: identificacionTitular || null,
          nombrecliente: nombreTitular || null
        };
      });

      // Calcular comisión (puede ser específica para servicios o usar una genérica)
      const comision = Number(userData?.comisiones?.pagoServicio?.administracionCanal || 0) +
        Number(userData?.comisiones?.pagoServicio?.agente || 0) +
        Number(userData?.comisiones?.pagoServicio?.cooperativa || 0);

      router.push({
        pathname: '/otpverificacion',
        params: {
          monto: valorDelRecibo.toString(),
          comision: comision,
          total: Number(valorDelRecibo) + Number(comision),
          labelTransaccion: menuLabel,
          accionTransaccion: menuAccion,
          otpCliente: userData?.jsonNegocio?.pagoServicio?.validarOtpCliente ?? false,
          otpAgente: userData?.jsonNegocio?.pagoServicio?.validarOtpAgente ?? false
        }
      });
    } catch (error) {
      console.error('Error en handleContinuar:', error);
      mostrarError('Error', error.message || 'Ocurrió un error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState('');

  // Función para ver detalles del servicio
  const handleVerDetalles = async () => {
    if (!servicioSeleccionado) {
      mostrarError('Error', 'Por favor seleccione un servicio');
      return;
    }

    if (!numeroContrato) {
      mostrarError('Error', 'Por favor ingrese el número de contrato o cuenta');
      return;
    }

    setCargandoDetalles(true);
    setDetallesServicio(null);
    
    try {
      const resultado = await ApiService.devuelveDetalleDelServicio({
        usuario: userData?.usuario,
        idServicio: servicioSeleccionado,
        valor: numeroContrato
      });
      
      console.log('Detalles del servicio obtenidos:', resultado);
      setDetallesServicio(resultado);
      setEsDetalleRecibo(false);
      setMostrarModalDetalles(true);      
    } catch (error) {
      console.error('Error al obtener detalles del servicio:', error);
      mostrarError('Error', error.message || 'No se pudieron obtener los detalles del servicio');
    } finally {
      setCargandoDetalles(false);
    }
  };

  // Función para renderizar todos los campos recursivamente (para recibos)
  const renderTodosLosCampos = (data, nivel = 0) => {
    if (!data || typeof data !== 'object') {
      return (
        <View style={styles.detalleRow}>
          <Text style={styles.detalleValue}>{String(data)}</Text>
        </View>
      );
    }

    return Object.entries(data).map(([key, value]) => {
      const esObjeto = value && typeof value === 'object' && !Array.isArray(value);
      const esArray = Array.isArray(value);

      // Formatear el nombre de la clave para que sea más legible
      const nombreFormateado = key
        .charAt(0).toUpperCase() + 
        key.slice(1).replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ');

      return (
        <View key={key} style={[styles.detalleRow, nivel > 0 && styles.detalleRowNested]}>
          <Text style={styles.detalleLabel}>
            {nombreFormateado}:
          </Text>
          {esObjeto ? (
            <View style={styles.detalleNested}>
              {renderTodosLosCampos(value, nivel + 1)}
            </View>
          ) : esArray ? (
            <View style={styles.detalleArray}>
              {value.map((item, index) => (
                <View key={index} style={styles.detalleArrayItem}>
                  <Text style={styles.detalleArrayLabel}>Item {index + 1}:</Text>
                  {renderTodosLosCampos(item, nivel + 1)}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.detalleValue}>{String(value || 'N/A')}</Text>
          )}
        </View>
      );
    });
  };

  // Función para mostrar campos específicos comunes
  const renderCamposEspecificos = (detalles) => {
    if (!detalles || typeof detalles !== 'object') {
      return (
        <Text style={styles.modalEmptyText}>No hay información disponible</Text>
      );
    }

    // Si es un recibo, mostrar todos los campos recursivamente
    if (esDetalleRecibo) {
      return renderTodosLosCampos(detalles);
    }

    // Lista de campos comunes a mostrar
    const camposComunes = [
      { key: 'nombre', label: 'Nombre' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'monto', label: 'Monto', formatter: (v) => `$${parseFloat(v || 0).toFixed(2)}` },
      { key: 'valor', label: 'Valor', formatter: (v) => `$${parseFloat(v || 0).toFixed(2)}` },
      { key: 'fechaVencimiento', label: 'Fecha de Vencimiento' },
      { key: 'estado', label: 'Estado' },
      { key: 'referencia', label: 'Referencia' },
      { key: 'numeroContrato', label: 'Número de Contrato' },
      { key: 'numeroCuenta', label: 'Número de Cuenta' },
      { key: 'saldo', label: 'Saldo', formatter: (v) => `$${parseFloat(v || 0).toFixed(2)}` },
      { key: 'deuda', label: 'Deuda', formatter: (v) => `$${parseFloat(v || 0).toFixed(2)}` },
      { key: 'cliente', label: 'Socio' },
      { key: 'nombreCliente', label: 'Nombre del Socio' },
      { key: 'identificacion', label: 'Identificación' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'email', label: 'Email' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'codigo', label: 'Código' },
      { key: 'id', label: 'ID' },
      { key: 'idServicio', label: 'ID Servicio' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'categoria', label: 'Categoría' },
    ];

    // Filtrar y mostrar solo los campos que existen en los detalles
    const camposAMostrar = camposComunes
      .map(({ key, label, formatter }) => {
        const valor = detalles[key];
        if (valor === undefined || valor === null || valor === '') return null;
        
        return (
          <View key={key} style={styles.detalleRow}>
            <Text style={styles.detalleLabel}>{label}:</Text>
            <Text style={styles.detalleValue}>
              {formatter ? formatter(valor) : String(valor)}
            </Text>
          </View>
        );
      })
      .filter(Boolean);

    // Si no hay campos comunes, mostrar todos los campos disponibles
    if (camposAMostrar.length === 0) {
      return Object.entries(detalles).map(([key, value]) => {
        if (value === null || value === undefined || value === '') return null;
        
        const nombreFormateado = key
          .charAt(0).toUpperCase() + 
          key.slice(1).replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ');

        return (
          <View key={key} style={styles.detalleRow}>
            <Text style={styles.detalleLabel}>{nombreFormateado}:</Text>
            <Text style={styles.detalleValue}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Text>
          </View>
        );
      }).filter(Boolean);
    }

    return camposAMostrar;
  };

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


  // Buscar servicios por texto (al presionar BUSCAR SERVICIO)
  const handleBuscarServicio = async () => {
    const criterio = (textoBusquedaServicio || '').trim();
    if (!criterio) {
      mostrarAdvertencia('Búsqueda vacía', 'Ingrese un criterio para buscar el servicio');
      return;
    }
    if (!userData?.usuario) {
      mostrarError('Error', 'No hay sesión de usuario');
      return;
    }
    setCargandoServicios(true);
    setServicios([]);
    setServicioSeleccionado('');
    try {
      const resultado = await ApiService.devuelveServiciosPorCategoria({
        usuario: userData.usuario,
        nombreCategoria: criterio
      });
      if (resultado?.servicios && Array.isArray(resultado.servicios)) {
        setServicios(resultado.servicios);
        if (resultado.servicios.length > 0) {
          setServicioSeleccionado(resultado.servicios[0].id || '');
        } else {
          mostrarInfo('Sin resultados', 'No se encontraron servicios con ese criterio');
        }
      } else {
        setServicios([]);
        mostrarInfo('Sin resultados', 'No se encontraron servicios con ese criterio');
      }
    } catch (error) {
      console.error('Error al buscar servicios:', error);
      setServicios([]);
      setServicioSeleccionado('');
      mostrarError('Error', error.message || 'No se pudieron buscar los servicios');
    } finally {
      setCargandoServicios(false);
    }
  };

  // Función para consultar y cargar recibos
  const handleConsultarRecibos = async () => {
    if (!servicioSeleccionado) {
      mostrarError('Error', 'Por favor seleccione un servicio');
      return;
    }

    if (!numeroContrato) {
      mostrarError('Error', 'Por favor ingrese el número de contrato o cuenta');
      return;
    }

    setCargandoRecibos(true);
    setRecibos([]);
    setReciboSeleccionado('');
    setRecibosConDetalles(new Map());

    try {
      console.log('Consultando recibos con:', {
        idProducto: servicioSeleccionado,
        referencia: numeroContrato,
        usuario: userData?.usuario
      });

      // Intentar primero con consultaServicio
      let resultado;
      try {
        resultado = await ApiService.consultaServicio({
          idProducto: servicioSeleccionado,
          referencia: numeroContrato,
          usuario: userData?.usuario
        });
        console.log('Respuesta de consultaServicio:', JSON.stringify(resultado, null, 2));
      } catch (consultaError) {
        console.log('Error en consultaServicio, intentando con devuelveDetalleDelServicio:', consultaError);
        // Si consultaServicio falla, intentar con devuelveDetalleDelServicio
        resultado = await ApiService.devuelveDetalleDelServicio({
          usuario: userData?.usuario,
          idServicio: servicioSeleccionado,
          valor: numeroContrato
        });
        console.log('Respuesta de devuelveDetalleDelServicio:', JSON.stringify(resultado, null, 2));
      }
      
      // Intentar diferentes estructuras de respuesta
      let recibosData = [];
      
      // Buscar arrays en diferentes niveles
      if (resultado?.recibos && Array.isArray(resultado.recibos)) {
        recibosData = resultado.recibos;
      } else if (resultado?.data && Array.isArray(resultado.data)) {
        recibosData = resultado.data;
      } else if (resultado?.items && Array.isArray(resultado.items)) {
        recibosData = resultado.items;
      } else if (resultado?.lista && Array.isArray(resultado.lista)) {
        recibosData = resultado.lista;
      } else if (resultado?.listado && Array.isArray(resultado.listado)) {
        recibosData = resultado.listado;
      } else if (Array.isArray(resultado)) {
        recibosData = resultado;
      } else if (resultado && typeof resultado === 'object') {
        // Buscar propiedades que puedan ser arrays
        const keys = Object.keys(resultado);
        for (const key of keys) {
          if (Array.isArray(resultado[key]) && resultado[key].length > 0) {
            recibosData = resultado[key];
            console.log(`Encontrado array en propiedad: ${key}`);
            break;
          }
        }
        
        // Si no se encontró ningún array, convertir el objeto en array
        if (recibosData.length === 0) {
          recibosData = [resultado];
        }
      }
      
      console.log('Recibos procesados:', recibosData);
      console.log('Cantidad de recibos:', recibosData.length);
      
      // Almacenar los recibos con sus detalles en un Map
      const recibosMap = new Map();
      recibosData.forEach((recibo, index) => {
        const reciboId = recibo.id || recibo.referencia || recibo.numero || recibo.codigo || `recibo-${index}`;
        // Almacenar el recibo completo con sus datos
        recibosMap.set(reciboId, {
          ...recibo,
          detalles: recibo // Los detalles pueden estar en el mismo objeto o se obtendrán después
        });
      });
      
      setRecibosConDetalles(recibosMap);
      setRecibos(recibosData);
      
      if (recibosData.length > 0) {
        // Usar el primer recibo como seleccionado por defecto
        const primerRecibo = recibosData[0];
        const reciboId = primerRecibo.id || primerRecibo.referencia || primerRecibo.numero || primerRecibo.codigo || `recibo-0`;
        setReciboSeleccionado(reciboId);
        console.log('Recibo seleccionado automáticamente:', reciboId);
      } else {
        console.warn('No se encontraron recibos en la respuesta');
        mostrarInfo('Información', 'No se encontraron recibos para los datos ingresados');
      }
    } catch (error) {
      console.error('Error al consultar recibos:', error);
      console.error('Detalles del error:', error.message, error.stack);
      mostrarError('Error', 'No se pudieron cargar los recibos: ' + (error.message || 'Error desconocido'));
      setRecibos([]);
      setRecibosConDetalles(new Map());
    } finally {
      setCargandoRecibos(false);
    }
  };

  // Función para manejar la selección de recibo (solo actualiza el estado)
  const handleSeleccionarRecibo = (reciboId) => {
    if (!reciboId) {
      setReciboSeleccionado('');
      return;
    }
    setReciboSeleccionado(reciboId);
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
        colors={['#2B4F8C', '#1e3a5f']}
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
                {'Seleccione los datos para el pago'}
              </Text>
              <Text style={styles.label}>Buscar servicio</Text>
              <TextInput
                style={styles.input}
                value={textoBusquedaServicio}
                onChangeText={(text) => setTextoBusquedaServicio((text || '').toUpperCase())}
                placeholder="Ingrese nombre o criterio del servicio"
                placeholderTextColor="#999"
                editable={!cargandoServicios}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.buscarServicioButton, cargandoServicios && styles.detailsButtonDisabled]}
                disabled={cargandoServicios}
                onPress={handleBuscarServicio}
              >
                {cargandoServicios ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buscarServicioButtonText}>BUSCAR SERVICIO</Text>
                )}
              </TouchableOpacity>

              {servicios.length > 0 && (
                <>
                  <Text style={styles.label}>Servicios</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={servicioSeleccionado}
                      onValueChange={(itemValue) => setServicioSeleccionado(itemValue)}
                      style={styles.picker}
                      dropdownIconColor="#000"
                    >
                      {servicios.map((servicio) => (
                        <Picker.Item
                          key={servicio.id}
                          label={servicio.nombre || 'Sin nombre'}
                          value={servicio.id || ''}
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              {/* Información del servicio seleccionado */}
              {servicioSeleccionado && (
                      <View style={styles.serviceDetails}>
                        <Text style={styles.label}>Número de Contrato/Cuenta:</Text>
                        <TextInput
                          style={styles.input}
                          value={numeroContrato}
                          onChangeText={setNumeroContrato}
                          placeholder="Ingrese el número de contrato o cuenta"
                          keyboardType="default"
                        />

                  <Text style={styles.label}>Identificación del Titular:</Text>
                            <TextInput
                    style={styles.input}
                    value={identificacionTitular}
                    onChangeText={setIdentificacionTitular}
                    placeholder="Ingrese la identificación del titular"
                    keyboardType="default"
                  />
                  
                  <Text style={styles.label}>Correo del Titular:</Text>
                  <TextInput
                    style={styles.input}
                    value={correoTitular}
                    onChangeText={setCorreoTitular}
                    placeholder="Ingrese el correo del titular"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  
                  {/* Botón Consultar Recibos */}
                          <TouchableOpacity
                    style={[
                      styles.detailsButton,
                      (!numeroContrato || cargandoRecibos) && styles.detailsButtonDisabled
                    ]}
                    disabled={!numeroContrato || cargandoRecibos}
                    onPress={handleConsultarRecibos}
                  >
                    {cargandoRecibos ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.detailsButtonText}>CONSULTAR</Text>
                    )}
                          </TouchableOpacity>

                  {/* Combo de Recibos */}
                  {numeroContrato && (
                    <>
                      <Text style={styles.label}>Recibos</Text>
                      <View style={styles.pickerContainer}>
                        {cargandoRecibos ? (
                          <ActivityIndicator size="small" color="#2957a4" style={styles.loadingIndicator} />
                        ) : (
                          <Picker
                            selectedValue={reciboSeleccionado}
                            onValueChange={(itemValue) => handleSeleccionarRecibo(itemValue)}
                            style={styles.picker}
                            dropdownIconColor="#000"
                            enabled={recibos.length > 0}
                          >
                            {recibos.length > 0 ? (
                              recibos.map((recibo, index) => {
                                const reciboId = recibo.id || recibo.referencia || recibo.numero || recibo.codigo || `recibo-${index}`;
                                const reciboLabel = recibo.descripcion || recibo.nombre || recibo.referencia || recibo.numero || `Recibo ${index + 1}`;                                
                                const fechaVencimientoLabel = recibo.fechaVencimiento ? recibo.fechaVencimiento.split('T')[0] : null;
                                return (
                                  <Picker.Item
                                    key={reciboId}
                                    label={reciboLabel + (fechaVencimientoLabel ? ' - ' + fechaVencimientoLabel : '')}
                                    value={reciboId}
                                  />
                                );
                              })
                            ) : (
                              <Picker.Item label="No hay recibos disponibles" value="" />
                            )}
                          </Picker>
                        )}
                        </View>

                      {/* Información del recibo seleccionado */}
                      {reciboSeleccionado && recibos.length > 0 && (() => {
                        const reciboSeleccionadoObj = recibos.find(r => {
                          const id = r.id || r.referencia || r.numero || r.codigo;
                          return id === reciboSeleccionado;
                        });
                        const reciboDetalles = recibosConDetalles.get(reciboSeleccionado);
                        const reciboInfo = reciboDetalles || reciboSeleccionadoObj;
                        
                        // Obtener monto desde importes si existe, o desde el objeto directamente
                        let monto = null;
                        if (reciboInfo?.importes && Array.isArray(reciboInfo.importes) && reciboInfo.importes.length > 0) {
                          const totalImportes = reciboInfo.importes.reduce((sum, imp) => {
                            const valor = imp.valorImporte?.monto || imp.monto || imp.valor || 0;
                            return sum + Number(valor);
                          }, 0);
                          monto = totalImportes > 0 ? totalImportes : null;
                        } else if (reciboInfo?.monto) {
                          monto = reciboInfo.monto;
                        } else if (reciboInfo?.valor) {
                          monto = reciboInfo.valor;
                        }
                        
                        const fechaVencimiento = reciboInfo?.fechaVencimiento ? reciboInfo.fechaVencimiento.split('T')[0] : null;
                        
                        return (monto || fechaVencimiento) ? (
                          <View style={styles.reciboInfoContainer}>
                            {monto && (
                              <View style={styles.reciboInfoRow}>
                                <Text style={styles.reciboInfoLabel}>Monto:</Text>
                                <Text style={styles.reciboInfoValue}>S/{parseFloat(monto).toFixed(2)}</Text>
                      </View>
                    )}
                            {fechaVencimiento && (
                              <View style={styles.reciboInfoRow}>
                                <Text style={styles.reciboInfoLabel}>Fecha Vencimiento:</Text>
                                <Text style={styles.reciboInfoValue}>{fechaVencimiento}</Text>
                  </View>
                            )}
                </View>
                        ) : null;
                      })()}

                    </>
                  )}

                  <View style={styles.inputContainer}>
                    <TouchableOpacity
                      style={[styles.continueButton, !numeroContrato && styles.continueButtonDisabled]}
                      disabled={!numeroContrato}
                      onPress={() => handleContinuar()}
                    >
                      <Text style={styles.continueButtonText}>CONTINUAR</Text>
                    </TouchableOpacity>
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

      {/* Modal para mostrar detalles del servicio */}
      <Modal
        visible={mostrarModalDetalles}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMostrarModalDetalles(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {esDetalleRecibo ? 'Detalles del Recibo' : 'Detalles del Servicio'}
              </Text>
              <TouchableOpacity 
                onPress={() => setMostrarModalDetalles(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
            >
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.modalHorizontalContent}
                nestedScrollEnabled={true}
              >
                {detallesServicio ? (
                  <View style={styles.detallesContent}>
                    {renderCamposEspecificos(detallesServicio)}
                  </View>
                ) : (
                  <Text style={styles.modalEmptyText}>No hay detalles disponibles</Text>
                )}
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  serviceDetails: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 5,
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
  loadingIndicator: {
    padding: 10,
  },
  detailsButton: {
    backgroundColor: '#2BAC6B',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  detailsButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buscarServicioButton: {
    backgroundColor: '#2B4F8C',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buscarServicioButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detallesContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  detallesTitle: {
    fontSize: 14,
    color: '#2B4F8C',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  detallesText: {
    fontSize: 12,
    color: '#495057',
    fontFamily: 'monospace',
  },
  detallesContent: {
    minWidth: '100%',
    flexGrow: 1,
  },
  detalleRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexWrap: 'wrap',
  },
  detalleRowNested: {
    marginLeft: 15,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#dee2e6',
  },
  detalleLabel: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
    flex: 1,
    minWidth: 120,
  },
  detalleValue: {
    fontSize: 14,
    color: '#212529',
    flex: 2,
    textAlign: 'right',
  },
  detalleNested: {
    flex: 1,
    marginTop: 5,
    width: '100%',
  },
  detalleArray: {
    flex: 1,
    width: '100%',
  },
  detalleArrayItem: {
    marginTop: 8,
    paddingLeft: 10,
    paddingTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#ced4da',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    marginBottom: 5,
  },
  detalleArrayLabel: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    backgroundColor: '#2B4F8C',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 5,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
  },
  modalHorizontalContent: {
    padding: 15,
    minWidth: '100%',
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    padding: 20,
  },
  reciboInfoContainer: {
    marginTop: 10,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  reciboInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reciboInfoLabel: {
    fontSize: 14,
    color: '#2B4F8C',
    fontWeight: '600',
  },
  reciboInfoValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: 'bold',
  },
});
