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
import { useKeyboardBottomInset } from '../hooks/useKeyboardBottomInset';
import ApiService from '../services/ApiService';
import { globalStyles } from '../styles/globalStyles';

export default function PagoServicioScreen() {
  const router = useRouter();
  const { setUserData, catalogos, userData } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const keyboardBottomInset = useKeyboardBottomInset();
  const { modalVisible, modalData, mostrarError, mostrarInfo, cerrarModal } = useCustomModal();
  const keyboardVerticalOffset = Math.max(insets.top, 20) + 56;
  const [loading, setLoading] = useState(false);
  const [menuLabel, setMenuLabel] = useState('');
  const [menuAccion, setMenuAccion] = useState('');
  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState('');
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  /** Campos del formulario (inputs del usuario) */
  const [formInputs, setFormInputs] = useState({
    referencia: '',
    codigoPensionAlimenticia: '',
    numeroCuotasPensionAlimenticia: '',
    valorTonelaje: '',
    valorAbono: '',
    valorRecarga: ''
  });
  /** Objeto construido para el request pagarServicio (se arma la primera vez que se obtienen los datos de consulta o recarga) */
  const [datosPagoServicio, setDatosPagoServicio] = useState(null);
  const [recargaSeleccionada, setRecargaSeleccionada] = useState('');
  const [consultaResponse, setConsultaResponse] = useState(null);
  const [tituloBoton, setTituloBoton] = useState('Consultar');
  const [cargandoDetalles, setCargandoDetalles] = useState(false);
  const [detallesServicio, setDetallesServicio] = useState(null);
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false);
  const [recibos, setRecibos] = useState([]);
  const [cargandoRecibos, setCargandoRecibos] = useState(false);
  const [reciboSeleccionado, setReciboSeleccionado] = useState('');
  const [esDetalleRecibo, setEsDetalleRecibo] = useState(false);
  const [recibosConDetalles, setRecibosConDetalles] = useState(new Map());
  const [mostrarModalRubros, setMostrarModalRubros] = useState(false);
  /** Índice hasta el cual hay rubros seleccionados (inclusive). Selección siempre contigua desde 0. -1 = ninguno. */
  const [rubrosSeleccionadosHasta, setRubrosSeleccionadosHasta] = useState(-1);

  const productoObj = productos.find(p =>
    String(p.idProducto || p.id || '') === String(productoSeleccionado)
  );
  const tieneConsulta = productoObj && (productoObj.trxConsulta != null && String(productoObj.trxConsulta).trim() !== '');
  const tipoPago = productoObj?.tipoPago || '';
  const tipoControl = productoObj?.tipoControl || '';
  const valoresRecarga = (() => {
    const raw = productoObj?.valoresRecarga;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  })();

  const idProductoActual = String(productoObj?.idProducto || productoObj?.id || productoSeleccionado || '');

  /** Construye datosPagoServicio a partir de la respuesta de consulta (Total/Abono/Parcial) */
  const buildDatosPagoServicioFromConsulta = (resultado, valor, rubros) => ({
    comision: resultado.comision != null ? Number(resultado.comision) : null,
    idProducto: idProductoActual || null,
    referencia: (formInputs.referencia || '').trim() || null,
    valor: Number(valor) || 0,
    secuencialResultadoTransaccion: resultado.secuencialResultadoTransaccion ?? null,
    comisionRubro: productoObj?.comisionRubro ?? null,
    rubros: rubros && Array.isArray(rubros) ? rubros : [],
    valorTonelaje: (formInputs.valorTonelaje || '').trim() || null,
    identificacion: null,
    numeroCuotasPensionesAlimenticiaPersona: (formInputs.numeroCuotasPensionAlimenticia || '').trim() !== '' ? parseInt(formInputs.numeroCuotasPensionAlimenticia, 10) : null,
    codigoPagarPensionesAlimenticiaEmpresa: (formInputs.codigoPensionAlimenticia || '').trim() || null,
    nombreCliente: resultado.nombre ?? null
  });

  /** Construye datosPagoServicio para flujo sin consulta (recarga) */
  const buildDatosPagoServicioRecarga = (valor) => ({
    comision: null,
    idProducto: idProductoActual || null,
    referencia: (formInputs.referencia || '').trim() || null,
    valor: Number(valor) || 0,
    secuencialResultadoTransaccion: null,
    comisionRubro: null,
    rubros: [],
    valorTonelaje: (formInputs.valorTonelaje || '').trim() || null,
    identificacion: null,
    numeroCuotasPensionesAlimenticiaPersona: null,
    codigoPagarPensionesAlimenticiaEmpresa: (formInputs.codigoPensionAlimenticia || '').trim() || null,
    nombreCliente: null
  });

  const navegarAOtpPagoServicio = (datosPago, consultaDatosOverride = null) => {
    const servicioObj = servicios.find(s =>
      String(s.servicio) === String(servicioSeleccionado)
    );
    const consultaDatos = consultaDatosOverride ?? consultaResponse;
    const valorPago = Number(datosPago?.valor ?? 0);
    const comisionNum = Number(datosPago?.comision ?? 0);
    const valorTotal = valorPago + comisionNum;
    setUserData(prev => ({
      ...prev,
      nombrecliente: datosPago?.nombreCliente ?? consultaDatos?.nombre ?? prev?.nombrecliente,
      pagoServicioFlow: {
        servicio: servicioObj || servicioSeleccionado,
        producto: productoObj || productoSeleccionado,
        consultaDatos: consultaDatos || null,
        datosPagoServicio: datosPago
      }
    }));
    const otpAgente = userData?.jsonNegocio?.cobroServicios?.validarOtpAgente ?? false;
    const otpCliente = userData?.jsonNegocio?.cobroServicios?.validarOtpCliente ?? false;
    router.push({
      pathname: '/otpverificacion',
      params: {
        transaccion: 'PagoServicio',
        accionTransaccion: menuAccion || 'pagoServicio',
        monto: String(valorPago),
        comision: String(comisionNum),
        total: String(valorTotal),
        labelTransaccion: 'Pago de servicio',
        otpCliente: otpCliente ? 'true' : 'false',
        otpAgente: otpAgente ? 'true' : 'false'
      }
    });
  };

  const handleConsultarOSiguiente = async () => {
    if (!servicioSeleccionado) {
      mostrarError('Error', 'Por favor seleccione un servicio');
      return;
    }
    if (productos.length > 0 && !productoSeleccionado) {
      mostrarError('Error', 'Por favor seleccione un producto');
      return;
    }
    const ref = (formInputs.referencia || '').trim();
    // En recargas (trxconsulta vacía / !tieneConsulta) la referencia también es obligatoria.
    if (!tieneConsulta && !ref) {
      mostrarError('Error', 'Ingrese la referencia / código para pago');
      return;
    }

    if (!tieneConsulta) {
      if (valoresRecarga.length > 0) {
        if (!recargaSeleccionada) {
          mostrarError('Error', 'Seleccione un valor de recarga');
          return;
        }
        const recarga = valoresRecarga.find(r =>
          String(r.Valor ?? r.valor ?? r.id ?? r) === String(recargaSeleccionada)
        );
        const valor = recarga ? (Number(recarga.Valor ?? recarga.valor ?? recarga.monto ?? recarga) || Number(recargaSeleccionada)) : Number(recargaSeleccionada);
        const datosRecarga = buildDatosPagoServicioRecarga(Number(valor) || 0);
        setDatosPagoServicio(datosRecarga);
        navegarAOtpPagoServicio(datosRecarga);
        return;
      }
      const valorRec = (formInputs.valorRecarga || '').trim();
      if (!valorRec || isNaN(Number(valorRec)) || Number(valorRec) <= 0) {
        mostrarError('Error', 'Ingrese el valor de recarga');
        return;
      }
      const datosRecarga = buildDatosPagoServicioRecarga(Number(valorRec));
      setDatosPagoServicio(datosRecarga);
      navegarAOtpPagoServicio(datosRecarga);
      return;
    }

    if (tituloBoton === 'Siguiente' && tipoPago === 'A') {
      const valorTotal = Number(consultaResponse?.valorTotal ?? consultaResponse?.valortotal ?? 0);
      const abono = (formInputs.valorAbono || '').trim();
      if (!abono || isNaN(Number(abono)) || Number(abono) <= 0) {
        mostrarError('Error', 'Ingrese el valor del abono');
        return;
      }
      if (Number(abono) > valorTotal) {
        mostrarError('Error', 'El abono no puede ser mayor al valor total');
        return;
      }
      const datosAbono = buildDatosPagoServicioFromConsulta(consultaResponse, Number(abono), consultaResponse?.rubros || []);
      setDatosPagoServicio(datosAbono);
      navegarAOtpPagoServicio(datosAbono, consultaResponse);
      return;
    }

    setLoading(true);
    try {
      const numCuotas = (formInputs.numeroCuotasPensionAlimenticia || '').trim();
      const numeroCuotasPension = numCuotas === '' ? 0 : parseInt(numCuotas, 10);
      const idProducto = String(productoObj?.idProducto || productoObj?.id || productoSeleccionado);

      const resultado = await ApiService.consultaServicio({
        referencia: ref,
        identificacion: userData?.identificacioncliente || '',
        idProducto,
        codigoPagarPensionesAlimenticiaEmpresa: (formInputs.codigoPensionAlimenticia || '').trim() || undefined,
        numeroCuotasPensionesAlimenticiaPersona: isNaN(numeroCuotasPension) ? 0 : numeroCuotasPension,
        valorTonelaje: (formInputs.valorTonelaje || '').trim() || undefined,
        usuario: userData?.usuario
      });

      if (resultado.codigoResultado !== '000') {
        mostrarError('Consulta', (resultado.mensaje || 'Código: ' + (resultado.codigoResultado || '') + ' -- ' + (resultado.mensaje || '')));
        return;
      }

      setConsultaResponse(resultado);
      setUserData(prev => ({ ...prev, nombrecliente: resultado.nombre || prev?.nombrecliente }));

      if (tipoPago === 'T') {
        const vt = (resultado.valorTotal ?? resultado.valortotal ?? '0').trim();
        if (vt === '0' || Number(vt) === 0) {
          mostrarError('Error', 'No existe pago');
          return;
        }
        const datosTotal = buildDatosPagoServicioFromConsulta(resultado, Number(vt), resultado.rubros || []);
        setDatosPagoServicio(datosTotal);
        navegarAOtpPagoServicio(datosTotal, resultado);
        return;
      }
      if (tipoPago === 'P') {
        const datosParcial = buildDatosPagoServicioFromConsulta(resultado, 0, []);
        setDatosPagoServicio(datosParcial);
        setRubrosSeleccionadosHasta(-1);
        setMostrarModalRubros(true);
        return;
      }
      if (tipoPago === 'A') {
        const valorTotal = Number(resultado.valorTotal ?? resultado.valortotal ?? 0);
        setFormInputs(prev => ({ ...prev, valorAbono: String(valorTotal) }));
        setTituloBoton('Siguiente');
        const datosAbono = buildDatosPagoServicioFromConsulta(resultado, 0, resultado.rubros || []);
        setDatosPagoServicio(datosAbono);
        return;
      }

      mostrarError('Error', 'Tipo de pago no soportado');
    } catch (error) {
      console.error('Error en obtenerDetalleConsulta:', error);
      mostrarError('Error', error.message || 'Error al consultar');
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState('');

  // Reset estado de consulta, datosPagoServicio y recarga al cambiar servicio o producto
  useEffect(() => {
    setConsultaResponse(null);
    setTituloBoton('Consultar');
    setDatosPagoServicio(null);
    setRecargaSeleccionada('');
  }, [servicioSeleccionado, productoSeleccionado]);

  // Cargar la acción del menú seleccionada (misma lógica que DatosTransaccionScreen)
  useEffect(() => {
    const loadMenuAction = async () => {
      try {
        const accion = await AsyncStorage.getItem('selectedMenuAccion');
        const label = await AsyncStorage.getItem('selectedMenuLabel');
        if (accion) setMenuAccion(accion);
        if (label) setMenuLabel(label);
      } catch (error) {
        console.error('Error al cargar la acción del menú:', error);
      }
    };
    loadMenuAction();
  }, []);

  // Función para ver detalles del servicio (usa consultaServicio - OpenAPI)
  const handleVerDetalles = async () => {
    if (!servicioSeleccionado) {
      mostrarError('Error', 'Por favor seleccione un servicio');
      return;
    }
    const ref = (formInputs.referencia || '').trim();
    if (!ref) {
      mostrarError('Error', 'Ingrese la referencia / código para pago');
      return;
    }

    setCargandoDetalles(true);
    setDetallesServicio(null);
    try {
      const idProducto = productoSeleccionado || servicioSeleccionado;
      const resultado = await ApiService.consultaServicio({
        idProducto,
        referencia: ref,
        usuario: userData?.usuario
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

  // Cargar servicios al montar la pantalla (obtenerServicios - OpenAPI)
  useEffect(() => {
    if (!userData?.usuario) return;

    const cargarServicios = async () => {
      setCargandoServicios(true);
      setServicios([]);
      setServicioSeleccionado('');
      try {
        const resultado = await ApiService.obtenerServicios({ usuario: userData.usuario });
        const lista = resultado?.servicios && Array.isArray(resultado.servicios) ? resultado.servicios : [];
        setServicios(lista);
        if (lista.length > 0) {
          setServicioSeleccionado(String(lista[0].servicio ?? ''));
        }
      } catch (error) {
        console.error('Error al cargar servicios:', error);
        setServicios([]);
        mostrarError('Error', error.message || 'No se pudieron cargar los servicios');
      } finally {
        setCargandoServicios(false);
      }
    };

    cargarServicios();
  }, [userData?.usuario]);

  // Cargar productos cuando cambia el servicio seleccionado (obtenerProductos - OpenAPI)
  useEffect(() => {
    if (!servicioSeleccionado || !userData?.usuario) {
      setProductos([]);
      setProductoSeleccionado('');
      return;
    }

    const servicioObj = servicios.find(s =>
      String(s.servicio) === String(servicioSeleccionado)
    );

    const cargarProductos = async () => {
      setCargandoProductos(true);
      setProductos([]);
      setProductoSeleccionado('');
      try {
        const resultado = await ApiService.obtenerProductos({
          idGrupo: servicioObj?.idGrupo,
          servicio: servicioObj?.servicio != null && servicioObj.servicio !== '' ? String(servicioObj.servicio) : undefined,
          usuario: userData.usuario
        });
        const lista = (resultado?.productos && Array.isArray(resultado.productos))
          ? resultado.productos
          : [];
        setProductos(lista);
        if (lista.length > 0) {
          const primerId = lista[0].idProducto || lista[0].id || '';
          setProductoSeleccionado(primerId);
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
        setProductos([]);
        mostrarError('Error', error.message || 'No se pudieron cargar los productos');
      } finally {
        setCargandoProductos(false);
      }
    };

    cargarProductos();
  }, [servicioSeleccionado, userData?.usuario]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#325191', '#38599E']}
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
        <KeyboardAvoidingView
          style={{ flex: 1, width: '100%' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardVerticalOffset : 0}
        >
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={[
              styles.scrollViewContent,
              {
                paddingBottom:
                  Math.max(20, insets.bottom + 16) + keyboardBottomInset + 40,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            <View style={globalStyles.card}>
              <Text style={styles.instruction}>
                {'Seleccione los datos para el pago'}
              </Text>

              <Text style={styles.label}>Servicio</Text>
              {cargandoServicios ? (
                <View style={styles.pickerContainer}>
                  <ActivityIndicator size="small" color="#2957a4" style={styles.loadingIndicator} />
                  <Text style={styles.loadingText}>Cargando servicios...</Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={servicioSeleccionado}
                    onValueChange={(itemValue) => {
                      setServicioSeleccionado(itemValue);
                      setProductos([]);
                      setProductoSeleccionado('');
                    }}
                    style={styles.picker}
                    dropdownIconColor="#000"
                    prompt="Seleccione un servicio"
                  >
                    <Picker.Item label="Seleccione un servicio" value="" />
                    {servicios.map((servicio) => (
                      <Picker.Item
                        key={String(servicio.servicio)}
                        label={servicio.nombre}
                        value={String(servicio.servicio ?? '')}
                      />
                    ))}
                  </Picker>
                </View>
              )}

              {/* Combo de productos (se carga al seleccionar servicio) */}
              {servicioSeleccionado && (
                <>
                  <Text style={styles.label}>Producto</Text>
                  {cargandoProductos ? (
                    <View style={styles.pickerContainer}>
                      <ActivityIndicator size="small" color="#2957a4" style={styles.loadingIndicator} />
                      <Text style={styles.loadingText}>Cargando productos...</Text>
                    </View>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={productoSeleccionado}
                        onValueChange={(itemValue) => setProductoSeleccionado(itemValue)}
                        style={styles.picker}
                        dropdownIconColor="#000"
                        prompt="Seleccione un producto"
                      >
                        <Picker.Item label="Seleccione un producto" value="" />
                        {productos.map((producto) => {
                          const idProd = producto.idProducto || producto.id || '';
                          const nombreProd = producto.nombre || 'Sin nombre';
                          return (
                            <Picker.Item
                              key={idProd}
                              label={nombreProd}
                              value={idProd}
                            />
                          );
                        })}
                      </Picker>
                    </View>
                  )}
                </>
              )}

              {/* Datos de pago */}
              {servicioSeleccionado && (
                <View style={styles.serviceDetails}>
                  <>
                    <Text style={styles.label}>Referencia / Código para pago</Text>
                    <TextInput
                      style={styles.input}
                      value={formInputs.referencia}
                      onChangeText={(t) => setFormInputs(prev => ({ ...prev, referencia: t }))}
                      placeholder="Ingrese referencia o código de pago"
                      keyboardType="default"
                    />
                  </>

                  {!tieneConsulta && valoresRecarga.length > 0 && (
                    <>
                      <Text style={styles.label}>Valor de recarga</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={recargaSeleccionada}
                          onValueChange={setRecargaSeleccionada}
                          style={styles.picker}
                          dropdownIconColor="#000"
                          prompt="Seleccione valor de recarga"
                        >
                          <Picker.Item label="Seleccione valor de recarga" value="" />
                          {valoresRecarga.map((v, i) => {
                            const val = v.Valor ?? v.valor ?? v.monto ?? v.id ?? v;
                            const label = v.nombre ?? v.label ?? `$${Number(val).toFixed(2)}`;
                            return <Picker.Item key={i} label={label} value={String(val)} />;
                          })}
                        </Picker>
                      </View>
                    </>
                  )}
                  {!tieneConsulta && valoresRecarga.length === 0 && productoObj && (
                    <>
                      <Text style={styles.label}>Valor recarga</Text>
                      <TextInput
                        style={styles.input}
                        value={formInputs.valorRecarga}
                        onChangeText={(t) => setFormInputs(prev => ({ ...prev, valorRecarga: t }))}
                        placeholder="Valor a recargar"
                        keyboardType="decimal-pad"
                      />
                    </>
                  )}

                  {(productoObj?.requierePensionAlimenticia || productoObj?.codigoPension) && (
                    <>
                      <Text style={styles.label}>Código pensión empresa</Text>
                      <TextInput
                        style={styles.input}
                        value={formInputs.codigoPensionAlimenticia}
                        onChangeText={(t) => setFormInputs(prev => ({ ...prev, codigoPensionAlimenticia: t }))}
                        placeholder="Código pensión (si aplica)"
                        keyboardType="default"
                      />
                      <Text style={styles.label}>Número cuotas pensión</Text>
                      <TextInput
                        style={styles.input}
                        value={formInputs.numeroCuotasPensionAlimenticia}
                        onChangeText={(t) => setFormInputs(prev => ({ ...prev, numeroCuotasPensionAlimenticia: t }))}
                        placeholder="0 si no aplica"
                        keyboardType="number-pad"
                      />
                    </>
                  )}
                  {(productoObj?.requiereTonelaje || productoObj?.valorTonelaje) && (
                    <>
                      <Text style={styles.label}>Valor tonelaje</Text>
                      <TextInput
                        style={styles.input}
                        value={formInputs.valorTonelaje}
                        onChangeText={(t) => setFormInputs(prev => ({ ...prev, valorTonelaje: t }))}
                        placeholder="Valor tonelaje (si aplica)"
                        keyboardType="decimal-pad"
                      />
                    </>
                  )}

                  {tieneConsulta && tipoPago === 'A' && consultaResponse && (
                    <>
                      <Text style={styles.valorTotalText}>
                        El valor a pagar es de: ${Number(consultaResponse.valorTotal ?? consultaResponse.valortotal ?? 0).toFixed(2)}
                      </Text>
                      <Text style={styles.label}>Abono</Text>
                      <TextInput
                        style={styles.input}
                        value={formInputs.valorAbono}
                        onChangeText={(t) => setFormInputs(prev => ({ ...prev, valorAbono: t }))}
                        placeholder="Ingrese valor del abono"
                        keyboardType="decimal-pad"
                      />
                    </>
                  )}

                  <View style={styles.inputContainer}>
                    <TouchableOpacity
                      style={[
                        styles.continueButton,
                        (loading ||
                          ((tieneConsulta || valoresRecarga.length === 0) && !formInputs.referencia.trim()) ||
                          (!tieneConsulta && valoresRecarga.length > 0 && (!recargaSeleccionada || !formInputs.referencia.trim()))
                        ) && styles.continueButtonDisabled
                      ]}
                      disabled={
                        loading ||
                        ((tieneConsulta || valoresRecarga.length === 0) && !formInputs.referencia.trim()) ||
                        (!tieneConsulta && valoresRecarga.length > 0 && (!recargaSeleccionada || !formInputs.referencia.trim()))
                      }
                      onPress={handleConsultarOSiguiente}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.continueButtonText}>{(!tieneConsulta && valoresRecarga.length > 0) ? 'SIGUIENTE' : tituloBoton.toUpperCase()}</Text>
                      )}
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

      {/* Modal pago parcial: elegir rubro */}
      <Modal
        visible={mostrarModalRubros}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMostrarModalRubros(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rubro (pago parcial)</Text>
              <TouchableOpacity
                onPress={() => setMostrarModalRubros(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ padding: 16, flexGrow: 1 }}
              showsVerticalScrollIndicator={true}
            >
              {(consultaResponse?.rubros && consultaResponse.rubros.length > 0) ? (
                <>                                    
                  <Text style={styles.modalRubroLabel}>Valor a pagar:</Text>
                  <Text style={styles.modalRubroMonto}>
                    $
                    {rubrosSeleccionadosHasta < 0
                      ? '0.00'
                      : consultaResponse.rubros
                          .slice(0, rubrosSeleccionadosHasta + 1)
                          .reduce((sum, r) => sum + Number(r.valorPagado ?? 0), 0)
                          .toFixed(2)}
                  </Text>
                  {consultaResponse.rubros.map((rubro, index) => {
                    const valor = Number(rubro.valorPagado || 0);
                    // Regla: en pago parcial solo se permite escoger el primer rubro.
                    const isSelected = rubrosSeleccionadosHasta === 0 && index === 0;
                    const isDisabled = index !== 0;
                    return (
                      <TouchableOpacity
                        key={rubro.idPago || `rubro-${index}`}
                        style={[
                          styles.modalRubroRow,
                          isSelected && styles.modalRubroRowSelected,
                          isDisabled && styles.modalRubroRowDisabled
                        ]}
                        disabled={isDisabled}
                        onPress={() => {
                          if (index !== 0) return;
                          setRubrosSeleccionadosHasta(isSelected ? -1 : 0);
                        }}
                      >
                        <View style={styles.modalRubroRowLeft}>
                          <View style={[styles.modalRubroCheck, isSelected && styles.modalRubroCheckSelected]}>
                            {isSelected && <Text style={styles.modalRubroCheckText}>✓</Text>}
                          </View>
                          <View>
                            <Text style={styles.modalRubroPrioridad}>
                              Prioridad {rubro.prioridad != null ? rubro.prioridad : index + 1}
                            </Text>
                            {rubro.periodo != null && (
                              <Text style={styles.modalRubroPeriodo}>{rubro.periodo}</Text>
                            )}
                          </View>
                        </View>
                        <Text style={styles.modalRubroValor}>${valor.toFixed(2)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[
                      styles.modalRubroSiguiente,
                      rubrosSeleccionadosHasta < 0 && styles.modalRubroSiguienteDisabled
                    ]}
                    disabled={rubrosSeleccionadosHasta < 0}
                    onPress={() => {
                      if (rubrosSeleccionadosHasta < 0 || !datosPagoServicio) return;
                      setMostrarModalRubros(false);
                      const rubrosElegidos = consultaResponse.rubros.slice(0, rubrosSeleccionadosHasta + 1);
                      const valorPago = rubrosElegidos.reduce(
                        (sum, r) => sum + Number(r.valorPagado || 0),
                        0
                      );
                      const datosActualizados = { ...datosPagoServicio, valor: valorPago, rubros: rubrosElegidos };
                      setDatosPagoServicio(datosActualizados);
                      navegarAOtpPagoServicio(datosActualizados, consultaResponse);
                    }}
                  >
                    <Text style={styles.modalRubroSiguienteText}>Siguiente</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.modalEmptyText}>No hay rubros disponibles</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  loadingText: {
    fontSize: 14,
    color: '#2B4F8C',
    marginTop: 8,
  },
  valorTotalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B4F8C',
    marginTop: 12,
    marginBottom: 8,
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
    // En Android el modal puede colapsar si solo usamos maxHeight; damos altura real.
    height: height * 0.8,
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
  modalRubroLabel: {
    fontSize: 14,
    color: '#2B4F8C',
    marginTop: 8,
    fontWeight: '600',
  },
  modalRubroMonto: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2B4F8C',
    marginBottom: 12,
  },
  modalRubroListTitle: {
    fontSize: 14,
    color: '#2B4F8C',
    marginBottom: 4,
    fontWeight: '600',
  },
  modalRubroHint: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  modalRubroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  modalRubroRowSelected: {
    borderColor: '#2957a4',
    backgroundColor: '#e8eef7',
  },
  modalRubroRowDisabled: {
    opacity: 0.6,
  },
  modalRubroRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalRubroCheck: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2957a4',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRubroCheckSelected: {
    backgroundColor: '#2957a4',
  },
  modalRubroCheckText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalRubroPrioridad: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalRubroPeriodo: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  modalRubroValor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B4F8C',
  },
  modalRubroSiguiente: {
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: '#2957a4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalRubroSiguienteDisabled: {
    backgroundColor: '#A0AEC0',
    opacity: 0.8,
  },
  modalRubroSiguienteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
