import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import ApiService from '../services/ApiService';

const { width } = Dimensions.get('window');

export default function HojaColectaScreen() {
  const router = useRouter();
  const { userData } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transacciones, setTransacciones] = useState([]);
  const [fecha, setFecha] = useState(new Date());
  const [resumen, setResumen] = useState({
    totalDepositos: 0,
    totalRetiros: 0,
    totalComisiones: 0,
    saldoCaja: 0
  });
  const [error, setError] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Cargando datos para el usuario:', userData?.usuario);
      
      // Verificar si tenemos datos de usuario
      if (!userData?.usuario) {
        console.error('No hay datos de usuario disponibles');
        setError('No hay datos de usuario disponibles');
        setTransacciones([]);
        setResumen({
          totalDepositos: 0,
          totalRetiros: 0,
          totalComisiones: 0,
          saldoCaja: 0
        });
        setLoading(false);
        return;
      }
      
      // Intentar obtener datos de la API
      let apiTransacciones = [];
      let apiResumen = {
        totalDepositos: 0,
        totalRetiros: 0,
        totalComisiones: 0,
        saldoCaja: 0
      };
      
      try {
        const response = await ApiService.obtenerTransaccionesHojaColecta({
          usuario: userData.usuario        
        });

        const tipos = await ApiService.obtenerTiposTransacciones({
          usuario: userData.usuario        
        });

        console.log('Respuesta transacciones completa:', JSON.stringify(response, null, 2));
        console.log('Respuesta tipos completa:', JSON.stringify(tipos, null, 2));
        
        // Manejar diferentes estructuras de respuesta
        let transaccionesData = [];
        if (response && typeof response === 'object') {
          // Intentar diferentes posibles estructuras
          if (response.transacciones && Array.isArray(response.transacciones)) {
            transaccionesData = response.transacciones;
          } else if (response.data && Array.isArray(response.data)) {
            transaccionesData = response.data;
          } else if (response.result && Array.isArray(response.result)) {
            transaccionesData = response.result;
          } else if (Array.isArray(response)) {
            transaccionesData = response;
          }
        }
        
        console.log('Transacciones extraídas:', transaccionesData);
              
        // Mapear la respuesta de la API al formato esperado
        apiTransacciones = transaccionesData.map((t, index) => ({  
          id: t.id || `trans-${index}`,
          tipo: t.tipo || t.tipoTransaccion || t.descripcion || 'Transacción',
          monto: t.valor || t.monto || t.importe || 0,
          valor: t.valor || t.monto || t.importe || 0,
          fecha: t.fecha || t.fechaSistema || t.fechaTransaccion || new Date().toISOString(),
          cliente: t.nombreCliente || t.cliente || t.nombre || 'Socio',
          cuenta: t.numeroCuenta || t.cuenta || 'Cuenta',
          identificacionCliente: t.identificacionCliente || t.identificacion || ''
        }));
        
        console.log('Transacciones mapeadas:', apiTransacciones);
        
        // Calcular resumen
        const totalDepositos = apiTransacciones
          ?.filter(t => t.tipo && (t.tipo.toLowerCase().includes('depósito') || t.tipo.toLowerCase().includes('deposito')))
          .reduce((sum, t) => sum + (t.valor || 0), 0) || 0;
          
        const totalRetiros = apiTransacciones
          ?.filter(t => t.tipo && t.tipo.toLowerCase().includes('retiro'))
          .reduce((sum, t) => sum + (t.valor || 0), 0) || 0;
          
        const totalComisiones = apiTransacciones
          ?.filter(t => t.tipo && (t.tipo.toLowerCase().includes('comisión') || t.tipo.toLowerCase().includes('comision')))
          .reduce((sum, t) => sum + (t.valor || 0), 0) || 0;
          
        const saldoCaja = tipos.saldoCaja || tipos.saldo || tipos.balance || 0;
        
        apiResumen = {
          totalDepositos,
          totalRetiros,
          totalComisiones,
          saldoCaja
        };
        
        console.log('Resumen calculado:', apiResumen);
        
      } catch (apiError) {
        console.error('Error en la API:', apiError);
        setError('Error de conexión. No se pudieron cargar los datos.');
        apiTransacciones = [];
        apiResumen = {
          totalDepositos: 0,
          totalRetiros: 0,
          totalComisiones: 0,
          saldoCaja: 0
        };
      }
      
      setTransacciones(apiTransacciones);
      setResumen(apiResumen);
      
    } catch (error) {
      console.error('Error general al cargar transacciones:', error);
      setError('Error al cargar datos.');
      setTransacciones([]);
      setResumen({
        totalDepositos: 0,
        totalRetiros: 0,
        totalComisiones: 0,
        saldoCaja: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
  };

  useEffect(() => {
    console.log('HojaColectaScreen: Componente montado');
    console.log('HojaColectaScreen: Usuario actual:', userData?.usuario);
    cargarDatos();
  }, [fecha]);

  useEffect(() => {
    console.log('HojaColectaScreen: Estado actualizado:', {
      loading,
      refreshing,
      error,
      transaccionesCount: transacciones.length,
      resumen
    });
  }, [loading, refreshing, error, transacciones, resumen]);

  // Asegurar que el componente siempre renderice algo
  if (!userData) {
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
                <Text style={styles.headerTitle}>HOJA DE COLECTA</Text>
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => router.push('/menu')}
              >
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No hay datos de usuario disponibles</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2B4F8C', '#2BAC6B']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Header with title */}
        <View style={styles.headerWrapper}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Text style={styles.backArrow}>‹</Text>                
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>HOJA DE COLECTA</Text>
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => router.push('/menu')}
              >
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main content container */}
        <View style={styles.mainContainer}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(20, insets.bottom + 16) }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.contentContainer}>
              {/* Mostrar error si existe */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorTitle}>Error al cargar datos</Text>
                  <Text style={styles.errorText}>{error}</Text>
                  <View style={styles.errorDetailsContainer}>
                    <Text style={styles.errorDetailsText}>
                      Usuario: {userData?.usuario || 'No disponible'}
                    </Text>
                    <Text style={styles.errorDetailsText}>
                      Fecha: {new Date().toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={cargarDatos}
                  >
                    <Text style={styles.retryButtonText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Sección de Resumen */}
              <View style={styles.summaryCard}>                
                
                <View style={styles.summaryRow}>
                  
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, {fontWeight: 'bold'}]}>Saldo Caja</Text>
                    <Text style={[styles.summaryValue, styles.balanceAmount]}>
                      S/ {(resumen?.saldoCaja || 0)}
                    </Text>
                  </View>   

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Depósitos</Text>
                    <Text style={[styles.summaryValue, styles.positiveAmount]}>S/ {(resumen?.totalDepositos || 0)}</Text>
                  </View>


                </View>
                
                <View style={[styles.summaryRow, {marginTop: 10}]}>                

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Comisiones</Text>
                    <Text style={[styles.summaryValue, styles.commissionAmount]}>S/ {(resumen?.totalComisiones || 0)}</Text>
                  </View>  

                  <View style={styles.summaryDivider} />    

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Retiros</Text>
                    <Text style={[styles.summaryValue, styles.negativeAmount]}>S/ {(resumen?.totalRetiros || 0)}</Text>
                  </View>
                </View>

                <View style={[styles.summaryRow, {marginTop: 10}]}>                

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Pago a Terceros</Text>
                    <Text style={[styles.summaryValue, styles.positiveAmount]}>S/ {(resumen?.totalComisiones || 0)}</Text>
                  </View>  

                  <View style={styles.summaryDivider} />    

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Abono a préstamos</Text>
                    <Text style={[styles.summaryValue, styles.positiveAmount]}>S/ {(resumen?.totalRetiros || 0)}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.transactionsTitle}>TRANSACCIONES</Text>
              {loading ? (
                <ActivityIndicator size="large" color="#2B4F8C" style={styles.loadingIndicator} />
              ) : transacciones.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No hay transacciones para mostrar</Text>
                </View>
              ) : (
                <View style={styles.transactionsContainer}>
                  {transacciones.map((transaccion) => (
                    <View key={transaccion.id} style={styles.transactionCard}>
                      <View style={styles.transactionHeader}>
                        <Text style={styles.transactionType}>{transaccion.tipo}</Text>
                        <Text style={[
                          styles.transactionAmount,
                          { color: transaccion.tipo === 'Depósito' ? '#2BAC6B' : '#E74C3C' }
                        ]}>
                          {transaccion.tipo === 'Depósito' ? '+' : '-'} S/ {transaccion.monto}
                        </Text>
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.detailText}>{transaccion.cliente}</Text>                        
                        <Text style={styles.detailText}>
                          {new Date(transaccion.fecha).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    </View>
  );
}

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
  mainContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingTop: 10,
    flexGrow: 1,
  },
  headerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -20, // Compensar el ancho del botón de retroceso
    marginRight: -20, // Compensar el ancho del botón de menú
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
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  backButton: {
    zIndex: 2,
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
  contentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: '90%',
    maxWidth: 500,
    alignSelf: 'center',
    borderRadius: 12,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  loadingIndicator: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    color: '#2B4F8C',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#2BAC6B',
  },
  negativeAmount: {
    color: '#E74C3C',
  },
  commissionAmount: {
    color: '#F39C12',
  },
  balanceAmount: {
    color: '#2B4F8C',
    fontSize: 20,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  transactionsTitle: {
    color: '#2B4F8C',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 5,
  },
  transactionsContainer: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B4F8C',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDetails: {
    marginTop: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginVertical: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorDetailsContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  errorDetailsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  retryButton: {
    backgroundColor: '#2B4F8C',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
