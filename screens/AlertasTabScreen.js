import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertasScreen from './AlertasScreen';
import HistorialAlertasScreen from './HistorialAlertasScreen';

const TABS = [
  { key: 'ingresar', label: 'INGRESAR ALERTA' },
  { key: 'historial', label: 'HISTORIAL ALERTAS' },
];

const { width } = Dimensions.get('window');

const AlertasTabScreen = () => {
  const [activeTab, setActiveTab] = useState('ingresar');
  const router = require('expo-router').useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#325191', '#38599E']}
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
              <Text style={styles.headerTitle}>ALERTAS</Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => router.push('/menu')}
            >
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {activeTab === 'ingresar' ? <AlertasScreen /> : <HistorialAlertasScreen />}
        </View>
      </LinearGradient>
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
  },
  header: {
    width: '100%',
    alignItems: 'center',
  },
  headerContent: {
    width: '100%',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
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
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    margin: 10,
    borderRadius: 25,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: 'bold',
  },
  activeTabLabel: {
    color: '#fff',
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
});

export default AlertasTabScreen;
