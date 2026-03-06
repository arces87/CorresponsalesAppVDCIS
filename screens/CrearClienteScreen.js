import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';
import { globalStyles } from '../styles/globalStyles';

export default function CrearClienteScreen() {
    const router = useRouter();
    const { userData, catalogos, loadingCatalogos } = useContext(AuthContext);
    const insets = useSafeAreaInsets();
    const { modalVisible, modalData, mostrarAdvertencia, mostrarError, mostrarExito, cerrarModal } = useCustomModal();
    const [loading, setLoading] = useState(false);

    // Estados para los campos del formulario
    const [tipoIdentificacion, setTipoIdentificacion] = useState('');
    const [identificacion, setIdentificacion] = useState('');
    const [nombres, setNombres] = useState('');
    const [apellidopaterno, setApellidoPaterno] = useState('');
    const [apellidomaterno, setApellidoMaterno] = useState('');
    const [genero, setGenero] = useState('M'); // 'M': Masculino, 'F': Femenino
    const [email, setEmail] = useState('');
    const [telefonoMovil, setTelefonoMovil] = useState('');
    const [telefonoDomicilio, setTelefonoDomicilio] = useState('');
    const [direccion, setDireccion] = useState('');
    const [referenciaDomicilio, setReferenciaDomicilio] = useState('');
    const [pais, setPais] = useState('');
    const [estadoCivil, setEstadoCivil] = useState('');
    const [huellaDactilar, setHuellaDactilar] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [fechaTemporal, setFechaTemporal] = useState('');
    const [generarPrevisionSocial, setGenerarPrevisionSocial] = useState(true);
    const [camposHabilitados, setCamposHabilitados] = useState(false);
    const [buscandoPersona, setBuscandoPersona] = useState(false);
    
    const onChangeFechaNacimiento = (event, selectedDate) => {
        if (Platform.OS === 'web') {
            // Para web, usamos el input type="date"
            if (event && event.target) {
                const fecha = event.target.value;
                if (fecha) {
                    const [year, month, day] = fecha.split('-');
                    const fechaObj = new Date(year, month - 1, day);
                    setFechaNacimiento(fechaObj);
                    setFechaTemporal(fecha);
                }
            }
        } else {
            // Para móvil, usamos el DateTimePicker nativo
            const currentDate = selectedDate || fechaNacimiento || new Date();
            setShowDatePicker(Platform.OS === 'ios');
            
            // Solo actualizar si se seleccionó una fecha (no en el evento de cierre)
            if (selectedDate) {
                setFechaNacimiento(currentDate);
            }
            
            // En Android, cerrar el picker después de seleccionar
            if (Platform.OS === 'android') {
                setShowDatePicker(false);
            }
        }
    };
    
    const showDatepicker = () => {
        if (Platform.OS === 'web') {
            // En web, el input date se activa automáticamente
            document.getElementById('fechaNacimientoInput')?.focus();
        } else {
            setShowDatePicker(true);
        }
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };
    
    const validatePhone = (phone) => {
        return /^[0-9]{7,15}$/.test(phone);
    };
    
    const validateIdentification = (id) => {
        // Validar que sea numérico (sin restricción de longitud)
        return /^[0-9]+$/.test(id);
    };

    // Cargar tipos de identificación - siempre usar el primero (DOCUMENTO NACIONAL DE IDENTIDAD)
    useEffect(() => {
        if (!loadingCatalogos && catalogos?.tiposIdentificaciones?.length > 0) {
            const firstTipoId = String(catalogos.tiposIdentificaciones[0].secuencial);
            // Forzar siempre el primer tipo de identificación
            setTipoIdentificacion(firstTipoId);
        } else if (!loadingCatalogos && (!catalogos?.tiposIdentificaciones || catalogos.tiposIdentificaciones.length === 0)) {
            setTipoIdentificacion('');
        }
    }, [catalogos, loadingCatalogos]);

    // Cargar país
    useEffect(() => {
        if (!loadingCatalogos && catalogos?.paises?.length > 0) {
            const firstPais = catalogos.paises[0].codigo;
            setPais(prev => {
                // Solo establecer si no hay un valor ya seleccionado o si el valor actual no existe en las opciones
                if (!prev || !catalogos.paises.some(p => p.codigo === prev)) {
                    return firstPais;
                }
                return prev;
            });
        } else if (!loadingCatalogos && (!catalogos?.paises || catalogos.paises.length === 0)) {
            setPais('');
        }
    }, [catalogos, loadingCatalogos]);

    // Cargar estado civil
    useEffect(() => {
        if (!loadingCatalogos && catalogos?.estadoCivil?.length > 0) {
            const firstEstadoCivil = String(catalogos.estadoCivil[0].codigo);
            setEstadoCivil(prev => {
                // Solo establecer si no hay un valor ya seleccionado o si el valor actual no existe en las opciones
                if (!prev || !catalogos.estadoCivil.some(e => String(e.codigo) === prev)) {
                    return firstEstadoCivil;
                }
                return prev;
            });
        } else if (!loadingCatalogos && (!catalogos?.estadoCivil || catalogos.estadoCivil.length === 0)) {
            setEstadoCivil('');
        }
    }, [catalogos, loadingCatalogos]);

    const handleBuscarPersona = async () => {
        if (!identificacion?.trim()) {
            mostrarAdvertencia('Campo requerido', 'Ingrese el número de identificación');
            return;
        }
        if (!tipoIdentificacion) {
            mostrarAdvertencia('Campo requerido', 'Seleccione el tipo de identificación');
            return;
        }
        if (!validateIdentification(identificacion.trim())) {
            mostrarAdvertencia('Identificación inválida', 'El número de identificación debe contener solo números');
            return;
        }
        setBuscandoPersona(true);
        try {
            const data = await ApiService.buscarCliente({
                identificacion: identificacion.trim(),
                secuencialTipoIdentificacion: parseInt(tipoIdentificacion, 10),
                usuario: userData?.usuario,
                ParaCrearSocio: true
            });
            if (data && (data.nombres != null || data.identificacion != null)) {
                setNombres(data.nombres ?? '');
                const apellidosStr = data.apellidos ?? '';
                const apellidosPartes = apellidosStr.trim().split(/\s+/);
                setApellidoPaterno(data.apellidoPaterno ?? apellidosPartes[0] ?? '');
                setApellidoMaterno(data.apellidoMaterno ?? (apellidosPartes.length > 1 ? apellidosPartes.slice(1).join(' ') : ''));
                setGenero(data.esMasculino === true || data.genero === 'M' ? 'M' : 'F');
                setEmail(data.mail ?? data.correoElectronico ?? '');
                setTelefonoMovil(data.telefonoCelular ?? data.telefono ?? '');
                setTelefonoDomicilio(data.telefonoDomicilio ?? '');
                setDireccion(data.direccionDomiciliaria ?? data.direccion ?? '');
                setReferenciaDomicilio(data.referenciaDomiciliaria ?? '');
                setPais(data.codigoPais ?? data.pais ?? pais);
                setEstadoCivil(data.codigoEstadoCivil != null ? String(data.codigoEstadoCivil) : estadoCivil);
                const fechaNacValor = data.fechaNacimientoCreacion ?? data.fechaNacimiento;
                if (fechaNacValor) {
                    const f = new Date(fechaNacValor);
                    if (!isNaN(f.getTime())) {
                        setFechaNacimiento(f);
                        setFechaTemporal(f.toISOString().split('T')[0]);
                    }
                }
                setCamposHabilitados(true);
                mostrarExito('Persona encontrada', 'Los datos se han cargado. Puede editarlos.');
            } else {
                setNombres('');
                setApellidoPaterno('');
                setApellidoMaterno('');
                setGenero('M');
                setEmail('');
                setTelefonoMovil('');
                setTelefonoDomicilio('');
                setDireccion('');
                setReferenciaDomicilio('');
                setPais('');
                setEstadoCivil('');
                setFechaNacimiento('');
                setFechaTemporal('');
                setCamposHabilitados(true);
                mostrarAdvertencia('Persona no encontrada', 'Complete los datos del formulario.');
            }
        } catch (error) {
            setNombres('');
            setApellidoPaterno('');
            setApellidoMaterno('');
            setGenero('M');
            setEmail('');
            setTelefonoMovil('');
            setTelefonoDomicilio('');
            setDireccion('');
            setReferenciaDomicilio('');
            setPais('');
            setEstadoCivil('');
            setFechaNacimiento('');
            setFechaTemporal('');
            setCamposHabilitados(true);
            mostrarAdvertencia('Persona no encontrada', 'Complete los datos del formulario.');
        } finally {
            setBuscandoPersona(false);
        }
    };

    const validateForm = () => {
        const errors = [];
        
        // Validar tipo de identificación
        if (!tipoIdentificacion) {
            errors.push('Tipo de identificación es requerido');
        }
        
        // Validar número de identificación
        if (!identificacion) {
            errors.push('Número de identificación es requerido');
        } else if (!validateIdentification(identificacion)) {
            errors.push('El número de identificación debe contener solo números');
        }
        
        // Validar nombres y apellidos
        if (!nombres || !nombres.trim()) {
            errors.push('Nombres son requeridos');
        }
        
        if (!apellidopaterno || !apellidopaterno.trim()) {
            errors.push('Apellido paterno es requerido');
        }
        
        // Validar dirección
        if (!direccion || !direccion.trim()) {
            errors.push('La dirección es requerida');
        }
        
        // Validar referencia de domicilio (opcional)
        if (referenciaDomicilio && referenciaDomicilio.length > 200) {
            errors.push('La referencia de domicilio no debe exceder los 200 caracteres');
        }
        
        // Validar correo electrónico
        if (!email) {
            errors.push('Correo electrónico es requerido');
        } else if (!validateEmail(email)) {
            errors.push('El correo electrónico no es válido');
        }
        
        // Validar teléfonos
        if (!telefonoMovil) {
            errors.push('Número de teléfono móvil es requerido');
        } else if (!validatePhone(telefonoMovil)) {
            errors.push('El número de teléfono móvil debe tener entre 7 y 15 dígitos');
        }
        
        if (telefonoDomicilio && !validatePhone(telefonoDomicilio)) {
            errors.push('El número de teléfono domiciliario debe tener entre 7 y 15 dígitos');
        }
        
        // Validar fecha de nacimiento
        if (!fechaNacimiento) {
            errors.push('Fecha de nacimiento es requerida');
        } else {
            const fechaNac = new Date(fechaNacimiento);
            const hoy = new Date();
            const edad = hoy.getFullYear() - fechaNac.getFullYear();
            
            if (isNaN(fechaNac.getTime())) {
                errors.push('La fecha de nacimiento no es válida');
            } else if (fechaNac > hoy) {
                errors.push('La fecha de nacimiento no puede ser futura');
            } else if (edad < 18) {
                errors.push('El socio debe ser mayor de edad');
            }
        }
        
        // Validar país
        if (!pais) {
            errors.push('Por favor seleccione un país');
        }
        
        // Validar estado civil
        if (!estadoCivil) {
            errors.push('Por favor seleccione un estado civil');
        }
        
        return errors;
    };

    const handleCrearCliente = async () => {
        const validationErrors = validateForm();
        
        if (validationErrors.length > 0) {
            mostrarAdvertencia('Errores de validación', validationErrors.join('\n'));
            return;
        }

        setLoading(true);
        try {
            const clienteData = {
                secuencialTipoIdentificacion: tipoIdentificacion,
                identificacion,
                nombres,
                apellidoPaterno: apellidopaterno || '',
                apellidoMaterno: apellidomaterno|| '',
                esMasculino: genero === 'M',
                telefonoCelular: telefonoMovil,
                telefonoDomicilio: telefonoDomicilio || null,
                referenciaDomiciliaria: referenciaDomicilio.trim() || null,
                codigoPais: pais || 'EC', // Por defecto Ecuador si no se selecciona
                codigoEstadoCivil: estadoCivil,
                codigoDactilar: huellaDactilar || null,
                mail: email,
                direccionDomiciliaria: direccion || '',
                fechaNacimiento: fechaNacimiento || null,
                usuario: userData?.usuario,
                generaPrevisionSocial: generarPrevisionSocial
            };

            // Intentar crear el cliente
            const response = await ApiService.crearCliente(clienteData);

            // Verificar si la creación fue exitosa
            if (!response || !response.secuencialCliente) {
                throw new Error('No se pudo crear el socio correctamente');
            }

            // Si no requiere apertura de cuenta, solo mostrar éxito y terminar
            if (!response.requiereAperturaCuenta) {
                mostrarExito('Éxito', 'Los datos del socio fueron actualizados');
                return;
            }

            // Solo proceder con la apertura de cuenta cuando requiereAperturaCuenta es true
            try {  
                const aperturaResponse = await ApiService.aperturaCuenta({
                    secuencialCuentaSocio: response.secuencialCuenta || null,
                    secuencialCuentaCorresponsal: 1,
                    secuencialCliente: response.secuencialCliente,
                    valorApertura: response.valorParaApertura,
                    nombreCliente: nombres + ' ' + apellidopaterno + ' ' + apellidomaterno,
                    identificacionCliente: identificacion,
                    usuario: userData?.usuario
                });

                // Verificar si la apertura fue exitosa
                if (!aperturaResponse || !aperturaResponse.cuentaAperturada) {
                    throw new Error('No se pudo aperturar la cuenta correctamente');
                }

                // Navegar a la pantalla de comprobante
                const fechaActual = new Date().toLocaleString('es-EC', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                router.replace({
                    pathname: '/comprobante',
                    params: {
                        monto: response.valorParaApertura.toString(),
                        comision: '0',
                        total: response.valorParaApertura.toString(),
                        referencia: aperturaResponse.documento || 'N/A',
                        fecha: fechaActual,
                        identificacionCliente: identificacion || '',
                        usuario: userData?.usuario || '',
                        negocio: userData?.nombreMostrar || ''
                    }
                });
            } catch (aperturaError) {
                console.error('Error al aperturar cuenta:', aperturaError);
                // Mostrar error pero mantener el cliente creado
                mostrarError('Error', aperturaError.message || 'El socio se creó correctamente, pero hubo un error al aperturar la cuenta');
                // Esperar un momento antes de navegar de vuelta
                setTimeout(() => {
                    router.back();
                }, 2000);
            }
        } catch (error) {
            console.error('Error al crear cliente:', error);
            // Si falla la creación del cliente, no se intenta abrir la cuenta
            mostrarError('Error', error.message || 'Ocurrió un error al crear el socio');
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
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(30, insets.bottom + 24) }}
                    showsVerticalScrollIndicator={true}
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
                                    <Text style={globalStyles.headerTitle}>CREAR SOCIO</Text>
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
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tipo de Identificación *</Text>
                            <View style={styles.pickerContainer}>
                                {loadingCatalogos || !catalogos?.tiposIdentificaciones?.length ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#2B4F8C" />
                                        <Text style={styles.loadingText}>
                                            {loadingCatalogos ? 'Cargando opciones...' : 'No hay opciones disponibles'}
                                        </Text>
                                    </View>
                                ) : (
                                    <Picker
                                        selectedValue={tipoIdentificacion}
                                        onValueChange={(itemValue) => itemValue != null && setTipoIdentificacion(itemValue)}
                                        style={styles.picker}
                                        dropdownIconColor="#2B4F8C"
                                        enabled={camposHabilitados}
                                    >
                                        {catalogos?.tiposIdentificaciones?.length > 0 && (
                                            <Picker.Item 
                                                key={catalogos.tiposIdentificaciones[0].secuencial} 
                                                label={catalogos.tiposIdentificaciones[0].nombre} 
                                                value={String(catalogos.tiposIdentificaciones[0].secuencial)} 
                                            />
                                        )}
                                    </Picker>
                                )}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Identificación *</Text>
                            <TextInput
                                style={styles.input}
                                value={identificacion}
                                onChangeText={setIdentificacion}
                                placeholder="Ingrese la identificación"
                                keyboardType="numeric"
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity
                                style={[styles.buscarPersonaButton, buscandoPersona && styles.buttonDisabled]}
                                onPress={handleBuscarPersona}
                                disabled={buscandoPersona}
                            >
                                {buscandoPersona ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.buscarPersonaButtonText}>Buscar persona</Text>
                                )}
                            </TouchableOpacity>
                        </View>                    

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Nombres *</Text>
                            <TextInput
                                style={[styles.input, !camposHabilitados && styles.inputDisabled]}
                                value={nombres}
                                onChangeText={setNombres}
                                placeholder="Ingrese los nombres"
                                placeholderTextColor="#999"
                                editable={camposHabilitados}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Apellido Paterno *</Text>
                            <TextInput
                                style={[styles.input, !camposHabilitados && styles.inputDisabled]}
                                value={apellidopaterno}
                                onChangeText={setApellidoPaterno}
                                placeholder="Ingrese apellido paterno"
                                placeholderTextColor="#999"
                                editable={camposHabilitados}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Apellido Materno *</Text>
                            <TextInput
                                style={[styles.input, !camposHabilitados && styles.inputDisabled]}
                                value={apellidomaterno}
                                onChangeText={setApellidoMaterno}
                                placeholder="Ingrese apellido materno"
                                placeholderTextColor="#999"
                                editable={camposHabilitados}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Género *</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={genero}
                                    onValueChange={setGenero}
                                    style={styles.picker}
                                    dropdownIconColor="#2B4F8C"
                                    enabled={camposHabilitados}
                                >
                                    <Picker.Item label="Masculino" value="M" />
                                    <Picker.Item label="Femenino" value="F" />
                                </Picker>
                            </View>
                        </View>                        

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Fecha de Nacimiento *</Text>
                            {Platform.OS === 'web' ? (
                                <input
                                    id="fechaNacimientoInput"
                                    type="date"
                                    value={fechaTemporal}
                                    onChange={onChangeFechaNacimiento}
                                    max={new Date().toISOString().split('T')[0]}
                                    style={styles.webDateInput}
                                    required
                                    disabled={!camposHabilitados}
                                />
                            ) : (
                                <>
                                    <TouchableOpacity 
                                        style={[
                                            styles.dateInput,                                            
                                            { width: '100%' },
                                            !camposHabilitados && styles.inputDisabled
                                        ]} 
                                        onPress={showDatepicker}
                                        disabled={!camposHabilitados}
                                    >
                                        <Text style={[styles.dateText, !fechaNacimiento && { color: '#999' }]}>
                                            {fechaNacimiento ? fechaNacimiento.toLocaleDateString('es-EC', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit'
                                            }) : 'Seleccione una fecha'}
                                        </Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={fechaNacimiento || new Date()}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={onChangeFechaNacimiento}
                                            maximumDate={new Date()}
                                            locale="es-EC"
                                            themeVariant="light"
                                        />
                                    )}
                                </>
                            )}                            
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Teléfono Móvil *</Text>
                            <TextInput
                                style={[styles.input, !camposHabilitados && styles.inputDisabled]}
                                value={telefonoMovil}
                                onChangeText={setTelefonoMovil}
                                placeholder="Ingrese el número de teléfono móvil"
                                keyboardType="phone-pad"
                                placeholderTextColor="#999"
                                maxLength={15}
                                editable={camposHabilitados}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Teléfono Domicilio</Text>
                            <TextInput
                                style={[styles.input, !camposHabilitados && styles.inputDisabled]}
                                value={telefonoDomicilio}
                                onChangeText={setTelefonoDomicilio}
                                placeholder="Ingrese el teléfono de domicilio (opcional)"
                                keyboardType="phone-pad"
                                placeholderTextColor="#999"
                                maxLength={15}
                                editable={camposHabilitados}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Dirección *</Text>
                            <TextInput
                                style={[styles.input, !camposHabilitados && styles.inputDisabled]}
                                value={direccion}
                                onChangeText={setDireccion}
                                placeholder="Ingrese la dirección completa"
                                placeholderTextColor="#999"
                                editable={camposHabilitados}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Referencia de Domicilio</Text>
                            <TextInput
                                style={[styles.input, !camposHabilitados && styles.inputDisabled]}
                                value={referenciaDomicilio}
                                onChangeText={setReferenciaDomicilio}
                                placeholder="Ej: Frente al parque central"
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={3}
                                editable={camposHabilitados}
                            />
                        </View>                        

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>País *</Text>
                            <View style={styles.pickerContainer}>
                                {loadingCatalogos || !catalogos?.paises?.length ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#2B4F8C" />
                                        <Text style={styles.loadingText}>
                                            {loadingCatalogos ? 'Cargando opciones...' : 'No hay opciones disponibles'}
                                        </Text>
                                    </View>
                                ) : (
                                    <Picker
                                        selectedValue={pais}
                                        onValueChange={(itemValue) => setPais(itemValue)}
                                        style={styles.picker}
                                        dropdownIconColor="#2B4F8C"
                                        enabled={camposHabilitados && !loadingCatalogos && catalogos?.paises?.length > 0}
                                    >                                    
                                        {catalogos?.paises?.map((paisItem) => (
                                            <Picker.Item 
                                                key={paisItem.codigo} 
                                                label={paisItem.nombre} 
                                                value={paisItem.codigo} 
                                            />
                                        ))}
                                    </Picker>
                                )}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Estado Civil *</Text>
                            <View style={styles.pickerContainer}>
                                {loadingCatalogos || !catalogos?.estadoCivil?.length ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#2B4F8C" />
                                        <Text style={styles.loadingText}>
                                            {loadingCatalogos ? 'Cargando opciones...' : 'No hay opciones disponibles'}
                                        </Text>
                                    </View>
                                ) : (
                                    <Picker
                                        selectedValue={estadoCivil}
                                        onValueChange={(itemValue) => setEstadoCivil(itemValue)}
                                        style={styles.picker}
                                        dropdownIconColor="#2B4F8C"
                                        enabled={camposHabilitados && !loadingCatalogos && catalogos?.estadoCivil?.length > 0}
                                    >                                    
                                        {catalogos?.estadoCivil?.map((estado) => (
                                            <Picker.Item 
                                                key={estado.codigo} 
                                                label={estado.nombre} 
                                                value={String(estado.codigo)} 
                                            />
                                        ))}
                                    </Picker>
                                )}
                            </View>
                        </View>

                        {false && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Huella Dactilar</Text>
                            <TextInput
                                style={styles.input}
                                value={huellaDactilar}
                                onChangeText={setHuellaDactilar}
                                placeholder="Código de huella dactilar"
                                placeholderTextColor="#999"
                                maxLength={50}
                            />
                        </View>
                        )}

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Correo Electrónico *</Text>
                            <TextInput
                                style={[styles.input, !camposHabilitados && styles.inputDisabled]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="ejemplo@correo.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor="#999"
                                editable={camposHabilitados}
                            />
                        </View>

                        <View style={styles.checkboxArea}>
                            <Text style={styles.checkboxLabel}>Generar Previsión Social</Text>
                            <Switch
                                value={generarPrevisionSocial}
                                onValueChange={setGenerarPrevisionSocial}
                                trackColor={{ false: '#ccc', true: '#2B4F8C' }}
                                thumbColor="#fff"
                            />
                        </View>
                        
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => router.back()}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>CANCELAR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={handleCrearCliente}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>GUARDAR</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingBottom: 20,
    },
    scrollContainer: {
        flex: 1,
        width: '100%',
    },
    headerWrapper: {
        width: '92%',
        alignSelf: 'center',
        paddingBottom: 0,
    },
    formGroup: {
        marginBottom: 15,
    },
    checkboxArea: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    checkboxLabel: {
        color: '#2B4F8C',
        fontSize: 16,
        fontWeight: '500',
    },
    label: {
        color: '#2B4F8C',
        marginBottom: 5,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        color: '#333',
    },
    inputDisabled: {
        backgroundColor: '#e9ecef',
        color: '#6c757d',
    },
    buscarPersonaButton: {
        backgroundColor: '#2B4F8C',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    buscarPersonaButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    dateInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    dateText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'left',
        paddingVertical: 10,
    },    
    webDateInput: {        
        borderWidth: 1,
        borderColor: '#E6F7FF',
        borderRadius: 5,
        padding: 10,
        marginBottom: 16,
        backgroundColor: '#fff',
        fontFamily: 'System',
        fontSize: 15,
        color: '#333',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#2B4F8C',
        borderRadius: 5,
        marginBottom: 15,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: '#2B4F8C',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        minHeight: 50,
    },
    loadingText: {
        marginLeft: 10,
        color: '#666',
        fontSize: 14,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 5,
    },
    saveButton: {
        backgroundColor: '#2B4F8C',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
