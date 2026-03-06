import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';

const menuItems = [
  { label: 'RETIRO', icon: require('../assets/ico-retiro.png'), route: '/datostransaccion', accion: 'retiro' },
  { label: 'DEPÓSITO', icon: require('../assets/ico-deposito.png'), route: '/datostransaccion', accion: 'deposito' },
  { label: 'PAGO PRÉSTAMOS', icon: require('../assets/ico-prestamo.png'), route: '/datostransaccionprestamo', accion: 'prestamo' },
  { label: 'PAGO SERVICIO', icon: require('../assets/ico-terceros.png'), route: '/pagodeservicio', accion: 'pago' },
  { label: 'CREAR CUENTA', icon: require('../assets/ico-cuentas.png'), route: '/crearcuenta', accion: 'cuenta' },
  { label: 'CREAR SOCIO', icon: require('../assets/ico-clientes.png'), route: '/crearcliente', accion: 'cliente' },
  { label: 'ALERTAS', icon: require('../assets/ico-alertas.png'), route: '/alertastab', accion: 'alerta' },
  { label: 'HOJA DE COLECTA', icon: require('../assets/ico-colecta.png'), route: '/hojacolecta', accion: 'colecta' },
  { label: 'HISTORIAL', icon: require('../assets/ico-historial.png'), route: '/historialtransacciones', accion: 'historial' },  
  { label: 'OBLIGACIONES', icon: require('../assets/ico-prestamo.png'), route: '/obligaciones', accion: 'obligaciones' },
];

export default function MenuScreen() {
  const router = useRouter();
  const { checkSessionExpired, setUserData } = useContext(AuthContext);
  const { modalVisible, modalData, mostrarAdvertencia, mostrarInfo, cerrarModal } = useCustomModal();

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Escalas simples basadas en un diseño guía ~375x812
  const hScale = width / 375;
  const vScale = height / 812;
  const mScale = (size) => Math.round(size * Math.min(1.15, Math.max(0.9, hScale)));
  // Altura fija para todos los botones para mantener consistencia
  const itemHeight = Math.max(100, Math.round(height * 0.12));
  const logoWidth = Math.min(Math.round(width * 0.8), 350);
  const iconSize = Math.round(28 * Math.min(1.2, Math.max(0.9, hScale)));
  const columns = width >= 768 ? 3 : 2;
  const percentWidth = columns === 3 ? '26%' : '42%';

  // Función para generar estilos responsivos
  const getResponsiveStyles = () => {
    const responsiveScale = Math.min(1.15, Math.max(0.9, width / 375));
    return {
      menuGrid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-evenly',
        rowGap: Math.round(10 * responsiveScale),
      },
      menuButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        borderRadius: 12,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        paddingHorizontal: Math.round(8 * responsiveScale),
        paddingVertical: Math.round(12 * responsiveScale),
      },
      menuIcon: {
        marginBottom: Math.round(6 * responsiveScale),
        // tintColor: '#2B4F8C', // Comentar para evitar problemas con íconos que no son monocromáticos
      },
      menuLabel: {
        color: '#2B4F8C',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 12,
        paddingHorizontal: Math.round(4 * responsiveScale),
      },
    };
  };

  const responsiveStyles = getResponsiveStyles();

  const handleLogout = async () => {
    setUserData(null);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('authToken');
    } catch (e) {}
    router.replace('/');
  }

  useEffect(() => {
    if (checkSessionExpired()) {
      mostrarAdvertencia('Sesión expirada', 'Por seguridad, tu sesión ha finalizado.');
      handleLogout();
    }
  }, []);

  const handleMenuItemPress = async (menuItem) => {
    // Guardar la acción seleccionada en AsyncStorage
    try {
      await AsyncStorage.setItem('selectedMenuLabel', menuItem.label); 
      await AsyncStorage.setItem('selectedMenuAccion', menuItem.accion);       
      if (menuItem.route) {
        router.push(menuItem.route);
      } else {
        mostrarInfo('Próximamente', 'Esta funcionalidad estará disponible próximamente');
      }
    } catch (error) {
      console.error('Error al guardar la acción del menú:', error);
      // Continuar con la navegación a pesar del error
      if (menuItem.route) {
        router.push(menuItem.route);
      } else {
        mostrarInfo('Próximamente', 'Esta funcionalidad estará disponible próximamente');
      }
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
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Image 
            source={require('../assets/logo-horizontal-blanco.png')} 
            style={[styles.logoHorizontal, { width: logoWidth }]}
            resizeMode="contain" 
          />
        </View>
        <ScrollView contentContainerStyle={[
          styles.menuContainer,
          { paddingBottom: Math.max(24, insets.bottom + 20), paddingHorizontal: Math.round(12 * hScale) }
        ]}>
        <View style={responsiveStyles.menuGrid}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                responsiveStyles.menuButton,
                { 
                  width: percentWidth, 
                  height: itemHeight,
                  maxHeight: itemHeight,
                }
              ]}
              onPress={() => handleMenuItemPress(item)}
            >
              {item.icon && (
                <Image 
                  source={item.icon} 
                  style={[responsiveStyles.menuIcon, { width: iconSize, height: iconSize }]} 
                  resizeMode="contain"
                />
              )}
              <Text 
                style={[responsiveStyles.menuLabel, { fontSize: mScale(12) }]} 
                allowFontScaling={false}
                numberOfLines={2}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[
            styles.logoutButton,
            { 
              width: columns === 3 
                ? Math.round((width - (Math.round(12 * hScale) * 2)) * 0.58) // Aproximadamente 2 botones de 26%
                : Math.round((width - (Math.round(12 * hScale) * 2)) * 0.9) // Aproximadamente 2 botones de 42%
            }
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText} allowFontScaling={false}>
            CERRAR SESIÓN
          </Text>
        </TouchableOpacity>
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
    </SafeAreaView>
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
  },
  header: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 10,
  },
  logo: {
    width: 55,
    height: 55,
    marginRight: 10,
  },
  logoHorizontal: {
    maxWidth: 350,
    height: 80,
    marginVertical: 10,
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    lineHeight: 24,
  },
  menuContainer: {
    width: '100%',
    alignItems: 'center',
  },
  menuGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    rowGap: 15,
  },
  menuButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    paddingHorizontal: 12,
  },
  menuIcon: {
    marginBottom: 10,
    // tintColor: '#2B4F8C', // Comentar para evitar problemas con íconos que no son monocromáticos
  },
  menuLabel: {
    color: '#2B4F8C',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#2B4F8C',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});
