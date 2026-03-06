import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';

const AlertasScreen = () => {
  const router = useRouter();
  const { catalogos, userData } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const { modalVisible, modalData, mostrarAdvertencia, mostrarError, mostrarExito, cerrarModal } = useCustomModal();
  
  // Cargar tipos de alerta cuando cambien los catálogos
  useEffect(() => {
    if (catalogos?.tiposAlertas) {
      // Establecer el primer tipo de alerta como seleccionado por defecto
      if (catalogos.tiposAlertas.length > 0 && !tipo) {
        setTipo(catalogos.tiposAlertas[0].id);
      }
      setLoadingCatalogos(false);
    } else if (catalogos) {
      setLoadingCatalogos(false);
    }
  }, [catalogos]);

  const handleRegistrar = async () => {
    if (!tipo || !descripcion.trim()) {
      mostrarAdvertencia('Campos requeridos', 'Seleccione tipo de alerta y escriba una descripción.');
      return;
    }
    
    if (!userData?.usuario) {
      mostrarError('Error de sesión', 'No se pudo obtener la información del usuario. Por favor, inicie sesión nuevamente.');
      return;
    }   

    setLoading(true);
    try {
      const resultado = await ApiService.crearAlerta({
        idTipo: tipo,
        descripcion: descripcion.trim(),
        usuario: userData.usuario,        
      });
      
      if(resultado){
        mostrarExito('Alerta registrada', 'La alerta ha sido registrada correctamente');
        setTipo(catalogos?.tiposAlertas?.[0]?.id || '');
        setDescripcion('');
      }
      else{
        mostrarError('Error', 'No se pudo registrar la alerta.');
      }
    } catch (error) {
      mostrarError('Error', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingCatalogos) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff"/>
        <Text style={styles.loadingText}>Cargando tipos de alerta...</Text>
      </View>
    );
  }

  if (!catalogos?.tiposAlertas?.length) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>No se pudieron cargar los tipos de alerta</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => router.replace('/menu')}
        >
          <Text style={styles.retryButtonText}>Volver al menú</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Tipo de Alerta</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={tipo}
            onValueChange={setTipo}
            style={styles.picker}
            dropdownIconColor="#000"
          >
            {catalogos.tiposAlertas.map((tipoItem) => (
              <Picker.Item 
                key={tipoItem.id} 
                label={tipoItem.nombre} 
                value={tipoItem.id} 
              />
            ))}
          </Picker>
        </View>
        <Text style={styles.label}>Descripcion</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Describa la alerta..."
        />
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleRegistrar}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Registrando...' : 'REGISTRAR'}</Text>
        </TouchableOpacity>
      </View>
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  formContainer: {
    flex: 1,
    width: '90%',
    maxWidth: 500,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  label: {
    color: '#2957a4',
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#2957a4',
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
  textInput: {
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});

export default AlertasScreen;
