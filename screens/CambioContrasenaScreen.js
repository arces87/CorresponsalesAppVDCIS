import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import CustomModal from '../components/CustomModal';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';

const CambioContrasenaScreen = () => {
  const router = useRouter();
  const { modalVisible, modalData, mostrarAdvertencia, mostrarError, mostrarExito, cerrarModal } = useCustomModal();
  const [contrasenaAnterior, setContrasenaAnterior] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [repetirContrasena, setRepetirContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContrasenaAnterior, setShowContrasenaAnterior] = useState(false);
  const [showNuevaContrasena, setShowNuevaContrasena] = useState(false);
  const [showRepetirContrasena, setShowRepetirContrasena] = useState(false);

  const handleCambiarContrasena = async () => {
    if (!contrasenaAnterior || !nuevaContrasena || !repetirContrasena) {
      mostrarAdvertencia('Campos requeridos', 'Por favor complete todos los campos');
      return;
    }

    if (nuevaContrasena !== repetirContrasena) {
      mostrarAdvertencia('Contraseñas no coinciden', 'Las contraseñas no coinciden');
      return;
    }

    if (nuevaContrasena.length < 6) {
      mostrarAdvertencia('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true); 

      const token = await AsyncStorage.getItem('authToken');

      console.log('Token:', token);

      const response = await ApiService.cambiarContrasena({
              token: token,
              contrasenia: nuevaContrasena,
              contraseniaAnterior: contrasenaAnterior
            });
      if(response){
        mostrarExito('Contraseña cambiada', 'Contraseña cambiada correctamente');
        // Esperar un momento antes de navegar para que el usuario vea el mensaje de éxito
        setTimeout(() => {
          router.back();
        }, 1500);
      }
      else {
        mostrarError('Error', 'No se pudo cambiar la contraseña. Intente nuevamente.');
      }   
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      mostrarError('Error', 'No se pudo cambiar la contraseña. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2B4F8C', '#1e3a5f']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={styles.topSection}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoHorizontal}
            resizeMode="contain"
          />
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>CAMBIO DE CONTRASEÑA</Text>
        </View>
        
        <View style={styles.formContainer}>
        <Text style={styles.label}>Ingrese su contraseña anterior</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={contrasenaAnterior}
            onChangeText={setContrasenaAnterior}
            placeholder="Contraseña anterior"
            secureTextEntry={!showContrasenaAnterior}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowContrasenaAnterior(!showContrasenaAnterior)}
            disabled={loading}
          >
            <Image 
              source={showContrasenaAnterior ? 
                require('../assets/eye-off.png') : 
                require('../assets/eye.png')} 
              style={styles.eyeIconImage}
            />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.label, { marginTop: 15 }]}>Ingrese su nueva contraseña</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={nuevaContrasena}
            onChangeText={setNuevaContrasena}
            placeholder="Nueva contraseña"
            secureTextEntry={!showNuevaContrasena}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowNuevaContrasena(!showNuevaContrasena)}
            disabled={loading}
          >
            <Image 
              source={showNuevaContrasena ? 
                require('../assets/eye-off.png') : 
                require('../assets/eye.png')} 
              style={styles.eyeIconImage}
            />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.label, { marginTop: 15 }]}>Repita su contraseña</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={repetirContrasena}
            onChangeText={setRepetirContrasena}
            placeholder="Repetir contraseña"
            secureTextEntry={!showRepetirContrasena}
            autoCapitalize="none"
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleCambiarContrasena}
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowRepetirContrasena(!showRepetirContrasena)}
            disabled={loading}
          >
            <Image 
              source={showRepetirContrasena ? 
                require('../assets/eye-off.png') : 
                require('../assets/eye.png')} 
              style={styles.eyeIconImage}
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCambiarContrasena}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>ACEPTAR</Text>
          )}
        </TouchableOpacity>
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
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  topSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  logoHorizontal: {    
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  formContainer: {
    width: '90%',
    maxWidth: 450,
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
    color: '#2B4F8C',
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2B4F8C',
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#2B4F8C',
  },
  eyeIcon: {
    padding: 10,
  },
  eyeIconImage: {
    width: 24,
    height: 24,
    tintColor: '#2B4F8C',
  },
  button: {
    backgroundColor: '#2B4F8C',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CambioContrasenaScreen;
