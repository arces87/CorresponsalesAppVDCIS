import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import ApiService from '../services/ApiService';

const formatSoloFecha = (fechaStr) => {
  if (fechaStr == null || String(fechaStr).trim() === '') return '';
  const d = new Date(fechaStr);
  if (Number.isNaN(d.getTime())) return String(fechaStr);
  return d.toLocaleDateString('es-EC', { dateStyle: 'short' });
};

const formatHora = (horaStr) => {
  if (horaStr == null || String(horaStr).trim() === '') return '';
  const s = String(horaStr).trim().replace(/\D/g, '');
  if (s.length >= 6) {
    return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
  }
  if (s.length >= 4) {
    return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  }
  return String(horaStr).trim();
};

const HistorialAlertasScreen = () => {
  const router = useRouter();
  const { userData } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlertas = async () => {
    setLoading(true);
    try {
      const data = await ApiService.listarAlertas({         
        usuario: userData?.usuario
      });
      setAlertas(data.alertas || []);
    } catch (err) {
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertas();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlertas();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <Text style={styles.tipo}>{item.idTipo || 'Tipo desconocido'}</Text>
      {(item.estado ?? item.estadoAlerta ?? item.estadoNombre ?? item.nombreEstado) ? (
        <Text style={styles.estado}>
          Estado: {String(item.estado ?? item.estadoAlerta ?? item.estadoNombre ?? item.nombreEstado)}
        </Text>
      ) : null}
      <Text style={styles.descripcion}>{item.descripcion}</Text>
      {(item.comentario ?? item.comentarios ?? item.observacion ?? item.observaciones) != null &&
       String(item.comentario ?? item.comentarios ?? item.observacion ?? item.observaciones).trim() !== '' ? (
        <Text style={styles.comentario}>
          Comentario: {String(item.comentario ?? item.comentarios ?? item.observacion ?? item.observaciones).trim()}
        </Text>
      ) : null}
      <Text style={styles.fecha}>
          {[formatSoloFecha(item.fecha), formatHora(item.hora)].filter(Boolean).join(' ')}
        </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Cargando alertas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <FlatList
          data={alertas}
          keyExtractor={(item, idx) => item.idAlerta?.toString() || idx.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#2B4F8C']}
              tintColor="#fff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay alertas registradas</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    width: '95%',
    maxWidth: 500,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  listContainer: {
    padding: 10,
    width: '100%',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2B4F8C',
    alignSelf: 'center',
  },
  tipo: {
    color: '#2B4F8C',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  estado: {
    color: '#2B4F8C',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  comentario: {
    color: '#555',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  descripcion: {
    color: '#444',
    fontSize: 14,
    marginBottom: 8,
  },
  fecha: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#2B4F8C',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default HistorialAlertasScreen;
