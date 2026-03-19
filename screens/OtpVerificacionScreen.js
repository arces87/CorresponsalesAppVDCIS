import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';
import { globalStyles } from '../styles/globalStyles';

const OtpVerificacionScreen = () => {
  const router = useRouter();
  const { monto, comision, total, labelTransaccion, otpCliente, otpAgente, accionTransaccion, transaccion } = useLocalSearchParams();
  const { userData, setUserData } = useContext(AuthContext);
  const esPagoServicio = accionTransaccion === 'pagoServicio';
  const flow = userData?.pagoServicioFlow || {};
  const productoNombre = esPagoServicio ? (flow?.producto?.nombre || flow?.producto?.nombreProducto || '') : '';
  const referenciaPago = esPagoServicio ? (flow?.datosPagoServicio?.referencia ?? '') : '';
  const insets = useSafeAreaInsets();
  const { modalVisible, modalData, mostrarAdvertencia, mostrarError, cerrarModal } = useCustomModal();
  // Obtener configuración de validación de OTP de la operación
  const validarOtpCliente = otpCliente === 'true' ? true : false;
  const validarOtpAgente = otpAgente === 'true' ? true : false;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpCorresponsal, setOtpCorresponsal] = useState(['', '', '', '', '', '']);
  const otpInputs = useRef([]);
  const otpCorresponsalInputs = useRef([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  // Evita reintentos/acciones tardías si el usuario sale de la pantalla mientras la solicitud OTP está en vuelo
  const solicitudOtpEnviadaRef = useRef(false);
  const [respuestaServicio, setRespuestaServicio] = useState({
    fecha: '',
    numeroCuenta: '',
    numeroTransaccion: '',
    monto: ''
  });

  // Keyboard visibility effect
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  
    useEffect(() => {
      // Si ya se solicitó OTP en esta pantalla, no volver a llamar.
      if (solicitudOtpEnviadaRef.current) return;

      // Guardamos si el componente sigue montado para ignorar respuestas tardías.
      let isActive = true;

      const usuario = userData?.usuario;
      const identificacionAgente = userData?.identificacion;
      const identificacionCliente = userData?.identificacioncliente;
      const secuencialTipoIdentificacion = userData?.secuencialTipoIdentificacion;

      // Esperar a que estén los campos requeridos antes de marcar como "ya solicitado".
      const puedeSolicitarOtp =
        !!usuario &&
        secuencialTipoIdentificacion != null &&
        (!validarOtpAgente || !!identificacionAgente) &&
        (!validarOtpCliente || !!identificacionCliente);

      if (!puedeSolicitarOtp) return;

      // Marcar como solicitado solo cuando ya tenemos la data mínima.
      solicitudOtpEnviadaRef.current = true;

      const solicitarOtps = async () => {
        if (validarOtpAgente) {
          try {
            const result = await ApiService.solicitarOtp({
              usuario,
              identificacion: identificacionAgente,
              secuencialTipoIdentificacion,
              paraAgente: true,
            });

            if (!isActive) return;

            if (result.otpGenerado) {
              if (result.notificationEmailError) {
                mostrarError('Error enviando correo', result.notificationEmailErrorMensaje);
                console.warn('Error enviando correo:', result.notificationEmailErrorMensaje);
                setTimeout(() => {
                  if (!isActive) return;
                  router.back();
                }, 2000);
              }
              if (result.notificationSMSError) {
                mostrarError('Error enviando SMS', result.notificationSMSErrorMensaje);
                console.warn('Error enviando SMS:', result.notificationSMSErrorMensaje);
                setTimeout(() => {
                  if (!isActive) return;
                  router.back();
                }, 2000);
              }
            }
          } catch (error) {
            if (!isActive) return;
            // Si el usuario salió de la pantalla, el fetch puede abortarse; no lo tratamos como error.
            if (error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted')) {
              return;
            }
            mostrarError('Error', 'Error al solicitar OTP: ' + error.message);
            console.error('Error al solicitar OTP:', error.message);
            setTimeout(() => {
              if (!isActive) return;
              router.back();
            }, 2000);
          }
        }

        if (validarOtpCliente) {
          try {
            const result = await ApiService.solicitarOtp({
              usuario,
              identificacion: identificacionCliente,
              secuencialTipoIdentificacion,
              paraAgente: false,
            });

            if (!isActive) return;

            if (result.otpGenerado) {
              if (result.notificationEmailError) {
                mostrarError('Error enviando correo', result.notificationEmailErrorMensaje);
                console.warn('Error enviando correo:', result.notificationEmailErrorMensaje);
                setTimeout(() => {
                  if (!isActive) return;
                  router.back();
                }, 2000);
              }
              if (result.notificationSMSError) {
                mostrarError('Error enviando SMS', result.notificationSMSErrorMensaje);
                console.warn('Error enviando SMS:', result.notificationSMSErrorMensaje);
                setTimeout(() => {
                  if (!isActive) return;
                  router.back();
                }, 2000);
              }
            }
          } catch (error) {
            if (!isActive) return;
            // Si el usuario salió de la pantalla, el fetch puede abortarse; no lo tratamos como error.
            if (error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('aborted')) {
              return;
            }
            mostrarError('Error', 'Error al solicitar OTP: ' + error.message);
            console.error('Error al solicitar OTP:', error.message);
            setTimeout(() => {
              if (!isActive) return;
              router.back();
            }, 2000);
          }
        }
      };

      solicitarOtps();

      return () => {
        isActive = false;
      };
    }, [
      validarOtpAgente,
      validarOtpCliente,
      userData?.usuario,
      userData?.identificacion,
      userData?.identificacioncliente,
      userData?.secuencialTipoIdentificacion
    ]);
  
  const handleOtpChange = (value, index, isCorresponsal = false) => {
    if (isCorresponsal) {
      const newOtp = [...otpCorresponsal];
      newOtp[index] = value;
      setOtpCorresponsal(newOtp);

      // Auto focus next input
      if (value && index < 5) {
        otpCorresponsalInputs.current[index + 1].focus();
      }
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto focus next input
      if (value && index < 5) {
        otpInputs.current[index + 1].focus();
      }
    }

    // Auto submit when last digit is entered
    if (value && index === 5) {
      Keyboard.dismiss();
    }
  };

  const handleBackspace = (index, nativeEvent, isCorresponsal = false) => {
    if (nativeEvent.key === 'Backspace') {
      if (isCorresponsal) {
        if (!otpCorresponsal[index] && index > 0) {
          otpCorresponsalInputs.current[index - 1].focus();
        }
      } else {
        if (!otp[index] && index > 0) {
          otpInputs.current[index - 1].focus();
        }
      }
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    const otpCorresponsalCode = otpCorresponsal.join('');

    // Validar código del cliente si está habilitado
    if (validarOtpCliente && otpCode.length !== 6) {
      mostrarAdvertencia('Código incompleto', 'Por favor ingrese el código OTP del socio completo');
      return;
    }

    // Validar código del corresponsal si está habilitado
    if (validarOtpAgente && otpCorresponsalCode.length !== 6) {
      mostrarAdvertencia('Código incompleto', 'Por favor ingrese el código OTP del corresponsal completo');
      return;
    }

    try {
      setIsLoading(true);
      
      // Verificar OTP del cliente si está habilitado
      if (validarOtpCliente) {
        await ApiService.verificarOtp({
          usuario: userData?.usuario,
          identificacion: userData?.identificacioncliente,
          otp: otpCode,
          paraAgente: false
        });
      }
      
      // Verificar OTP del corresponsal si está habilitado
      if (validarOtpAgente) {
        await ApiService.verificarOtp({
          usuario: userData?.usuario,
          identificacion: userData?.identificacion,
          otp: otpCorresponsalCode,
          paraAgente: true
        });
      }
     
      if(accionTransaccion === 'deposito'){
        console.log('userData', userData);
        const response = await ApiService.procesarDeposito({
          secuencialCuenta: userData?.secuencialcuenta,
          numeroCuentaCliente: userData?.numerocuentacliente,
          tipoCuentaCliente: userData?.tipocuenta,
          valor: monto,
          nombreCliente: userData?.nombrecliente,
          identificacionCliente: userData?.identificacioncliente,
          tipoIdentificacionCliente: userData?.tipoidentificacioncliente,          
          descripcion: accionTransaccion,
          usuario: userData?.usuario,
        });
        console.log('Response:', response);
        respuestaServicio.fecha = response.fechaTransaccion;
        respuestaServicio.numeroCuenta = response.numeroCuenta;
        respuestaServicio.numeroTransaccion = response.numeroTransaccion;
        respuestaServicio.monto = response.valor;
      }
      
      if (accionTransaccion === 'retiro') {
        console.log('userData', userData);    
        const response = await ApiService.procesarRetiro({
          secuencialCuenta: userData?.secuencialcuenta,
          numeroCuentaCliente: userData?.numerocuentacliente,
          tipoCuentaCliente: userData?.tipocuenta,
          valor: monto,
          nombreCliente: userData?.nombrecliente,
          identificacionCliente: userData?.identificacioncliente,
          tipoIdentificacionCliente: userData?.tipoIdentificacioncliente,                   
          descripcion: accionTransaccion,
          usuario: userData?.usuario,
        });
        console.log('Response:', response);
        respuestaServicio.fecha = response.fechaTransaccion;
        respuestaServicio.numeroCuenta = response.numeroCuenta;
        respuestaServicio.numeroTransaccion = response.numeroTransaccion;
        respuestaServicio.monto = response.valor;
      }

      if (accionTransaccion === 'prestamo' || accionTransaccion === 'adelantacuota') {
        throw new Error('El flujo de préstamos no está disponible.');
      }

      if (accionTransaccion === 'obligaciones') {
        throw new Error('El pago de obligaciones no está disponible.');
      }

      if (accionTransaccion === 'pagoServicio') {
        const flow = userData?.pagoServicioFlow || {};
        const datosPagoServicio = flow?.datosPagoServicio || {};
        const valorPago = Number(datosPagoServicio.valor ?? monto ?? 0);
        const comisionNum = Number(datosPagoServicio.comision ?? comision ?? 0);
        const response = await ApiService.pagarServicio({
          idProducto: datosPagoServicio.idProducto ?? null,
          referencia: datosPagoServicio.referencia ?? null,
          valor: valorPago,
          comision: comisionNum,
          nombreCliente: datosPagoServicio.nombreCliente ?? userData?.nombrecliente ?? null,
          descripcion: accionTransaccion,
          secuencialResultadoTransaccion: datosPagoServicio.secuencialResultadoTransaccion ?? null,
          comisionRubro: datosPagoServicio.comisionRubro ?? null,
          valorTonelaje: datosPagoServicio.valorTonelaje ?? null,
          numeroCuotasPensionesAlimenticiaPersona: datosPagoServicio.numeroCuotasPensionesAlimenticiaPersona ?? null,
          codigoPagarPensionesAlimenticiaEmpresa: datosPagoServicio.codigoPagarPensionesAlimenticiaEmpresa ?? null,
          rubros: datosPagoServicio.rubros && datosPagoServicio.rubros.length > 0 ? datosPagoServicio.rubros : null,
          usuario: userData?.usuario
        });
        const pago = response?.pagosFacilito?.[0];
        const fechaRaw = pago?.fechaTransaccion ?? response?.fechaTransaccion ?? response?.fecha ?? '';
        const horaRaw = pago?.horaTransaccion ?? response?.horaTransaccion ?? '';
        const fechaFormato = pago?.fechaTransaccionFinancial;
        const horaFormateada = horaRaw && String(horaRaw).length >= 6
          ? `${String(horaRaw).slice(0, 2)}:${String(horaRaw).slice(2, 4)}:${String(horaRaw).slice(4, 6)}`
          : '';
        respuestaServicio.fecha = (fechaFormato && horaFormateada)
          ? `${fechaFormato} ${horaFormateada}`
          : (fechaFormato || fechaRaw);
        respuestaServicio.numeroCuenta = pago?.numeroCuenta ?? response?.numeroCuenta ?? '';
        respuestaServicio.numeroTransaccion = pago?.documento ?? response?.documento ?? '';
        respuestaServicio.monto = pago?.valorPagado ?? response?.valor ?? valorPago;
      }

      setUserData(prev => {
        const next = { ...prev };
        delete next.identificacioncliente;
        delete next.nombrecliente;
        delete next.tipocuenta;
        delete next.valor;
        delete next.pagoServicioFlow;
        return next;
      });

      router.push({
        pathname: '/comprobante',
        params: {
          fecha: respuestaServicio.fecha,
          monto: respuestaServicio.monto,
          comision: comision,
          total: total,
          referencia: respuestaServicio.numeroTransaccion,
          labelTransaccion: labelTransaccion || '',
          nombreSocio: userData?.nombrecliente || '',
          numeroCuenta: respuestaServicio.numeroCuenta || userData?.numerocuentacliente || '',
          codigoOperacion: respuestaServicio.numeroTransaccion || '',
          observacion: userData?.observacionDeposito || '',
          usuario: userData?.usuario || '',
          negocio: userData?.nombreMostrar || '',
          identificacionCliente: userData?.identificacioncliente || '',
          ...(esPagoServicio && {
            productoNombre: productoNombre || '',
            referenciaCliente: referenciaPago || ''
          })
        }
      });

    } catch (error) {
      console.error('Error al verificar OTP:', error);
      mostrarError('Operación falló', error.message || 'Error al verificar el código OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
              <Text style={globalStyles.headerTitle}>VERIFICACIÓN TRANSACCIÓN</Text>
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(24, insets.bottom + 24) }]}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.card}>
          <Text style={styles.instruction}>
            Si se solicita código de verificación para completar la operación, por favor consulte su teléfono y/o correo electrónico e ingrese el código recibido. 
          </Text>

          <View style={styles.transactionInfo}>
            {labelTransaccion != null && String(labelTransaccion).trim() !== '' && (
              <Text style={styles.transactionType}>
                Datos de la transacción: {labelTransaccion}
              </Text>
            )}
            {(userData?.nombrecliente || userData?.recibo?.titularCuenta) != null && String(userData?.nombrecliente || userData?.recibo?.titularCuenta || '').trim() !== '' && (
              <Text style={styles.transactionType}>
                Socio: {userData?.nombrecliente || userData?.recibo?.titularCuenta}
              </Text>
            )}
            {(userData?.identificacioncliente || userData?.identificaciontitular || userData?.recibo?.identificacion) != null && String(userData?.identificacioncliente || userData?.identificaciontitular || userData?.recibo?.identificacion || '').trim() !== '' && (
              <Text style={styles.transactionType}>
                Identificacion: {userData?.identificacioncliente || userData?.identificaciontitular || userData?.recibo?.identificacion}
              </Text>
            )}
            {(userData?.numerocuentacliente || userData?.codigoprestamo || userData?.referencia) != null && String(userData?.numerocuentacliente || userData?.codigoprestamo || userData?.referencia || '').trim() !== '' && (
              <Text style={styles.transactionType}>
                Cuenta: {userData?.numerocuentacliente || userData?.codigoprestamo || userData?.referencia}
              </Text>
            )}
            {productoNombre != null && String(productoNombre).trim() !== '' && (
              <Text style={styles.transactionType}>
                Producto: {productoNombre}
              </Text>
            )}
            {referenciaPago != null && String(referenciaPago).trim() !== '' && (
              <Text style={styles.transactionType}>
                Referencia: {referenciaPago}
              </Text>
            )}
            {userData?.tipoRegistroFirma != null && userData?.tipoRegistroFirma !== '' && (
              <Text style={styles.transactionType}>
                Cuenta registro: {userData?.tipoRegistroFirma}
              </Text>
            )}
            {monto != null && monto !== '' && !isNaN(parseFloat(monto)) && (
              <Text style={styles.transactionType}>
                Valor: ${parseFloat(monto).toFixed(2)}
              </Text>
            )}
            {comision != null && comision !== '' && !isNaN(parseFloat(comision)) && (
              <Text style={styles.transactionType}>
                Comisión: ${parseFloat(comision).toFixed(2)}
              </Text>
            )}
            {total != null && total !== '' && !isNaN(parseFloat(total)) && (
              <Text style={styles.amount}>Total: ${parseFloat(total).toFixed(2)}</Text>
            )}
          </View>

          {validarOtpCliente && (
            <>
              <Text style={styles.otpLabel}>Código del Socio</Text>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <View key={`client-${index}`} style={styles.otpBox}>
                    <TextInput
                      ref={(ref) => (otpInputs.current[index] = ref)}
                      style={[
                        styles.otpText,
                        digit && styles.otpBoxFocused,
                        !validarOtpCliente && styles.otpDisabled
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index, false)}
                      onKeyPress={({ nativeEvent }) => handleBackspace(index, nativeEvent, false)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      editable={!isLoading && validarOtpCliente}
                      selectionColor="#007AFF"
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          {validarOtpAgente && (
            <>
              <Text style={[styles.otpLabel, { marginTop: validarOtpCliente ? 25 : 0 }]}>Código del Corresponsal</Text>
              <View style={styles.otpContainer}>
                {otpCorresponsal.map((digit, index) => (
                  <View key={`corresponsal-${index}`} style={styles.otpBox}>
                    <TextInput
                      ref={(ref) => (otpCorresponsalInputs.current[index] = ref)}
                      style={[
                        styles.otpText,
                        digit && styles.otpBoxFocused,
                        !validarOtpAgente && styles.otpDisabled
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index, true)}
                      onKeyPress={({ nativeEvent }) => handleBackspace(index, nativeEvent, true)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      editable={!isLoading && validarOtpAgente}
                      selectionColor="#007AFF"
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              (isLoading ||
                (validarOtpCliente && otp.some(digit => !digit)) ||
                (validarOtpAgente && otpCorresponsal.some(digit => !digit))
              ) && styles.buttonDisabled
            ]}
            onPress={handleVerifyOtp}
            disabled={
              isLoading ||
              (validarOtpCliente && otp.some(digit => !digit)) ||
              (validarOtpAgente && otpCorresponsal.some(digit => !digit))
            }
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continuar</Text>
            )}
          </TouchableOpacity>          
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
};

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
    flexGrow: 1,
    width: '100%',
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerWrapper: {
    width: '92%',
    alignSelf: 'center',
    paddingTop: 40,
    paddingBottom: 0
  },
  header: {
    width: '100%',
    alignItems: 'center',
  },
  backButton: {
    zIndex: 1,
    padding: 10,
    minWidth: 50, // Asegurar ancho consistente
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#fff',
    fontSize: 35,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -20, // Compensar el ancho del botón de retroceso
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
    justifyContent: 'flex-start',
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
    alignSelf: 'center',
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
  transactionInfo: {
    backgroundColor: '#F8FAFF',
    padding: 25,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E8ECFF',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2B4F8C',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 10,
    fontWeight: '400',
    textAlign: 'center',
  },
  otpLabel: {
    fontSize: 16,
    color: '#2B4F8C',
    marginBottom: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    marginBottom: 20,
  },
  otpBox: {
    borderBottomWidth: 2,
    borderBottomColor: '#2B4F8C',
    width: 45,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  otpText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
    padding: 0,
    width: '100%',
    textAlign: 'center',
  },
  otpBoxFocused: {
    borderBottomColor: '#007AFF',
  },
  otpDisabled: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  button: {
    backgroundColor: '#2B4F8C',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    width: '90%',
    alignSelf: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  resendLink: {
    color: '#2B4F8C',
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginHorizontal: 5,
  },
  resendDisabled: {
    color: '#999',
  },
});

export default OtpVerificacionScreen;
