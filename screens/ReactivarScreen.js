import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomModal from '../components/CustomModal';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import ApiService from '../services/ApiService';

export default function ReactivarScreen() {
    const router = useRouter();  
    const { userData } = useContext(AuthContext);
    const { modalVisible, modalData, mostrarAdvertencia, mostrarError, mostrarExito, cerrarModal } = useCustomModal();
    
    const handleActivacion = async () => {
        if (!userData.usuario || !userData.contrasenia) {
            mostrarAdvertencia('Campos requeridos', 'Por favor ingrese usuario y clave.');
            return;
        }
        try {
             const response = await ApiService.solicitudActivacion({
                usuario: userData.usuario,
                contrasenia: userData.contrasenia
            });             
            mostrarExito('Activación enviada', 'Solicitud de activación enviada correctamente.');
            // Esperar un momento antes de navegar para que el usuario vea el mensaje de éxito
            setTimeout(() => {
                router.replace('/');
            }, 1500);
        } catch (error) {
            mostrarError('Error', 'Error en la activación: ' + (error.message || error));
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
                <View style={styles.topSection}>
                    <Image 
                        source={require('../assets/location-icon.png')} 
                        style={styles.icon} 
                        resizeMode="contain" 
                    />
                </View>
                <View style={styles.card}>
                    <Text style={styles.title}>ACTIVAR DISPOSITIVO</Text>
                    <Text style={styles.subtitle}>Ingrese a Corresponsales Solidarios para activar el dispositivo</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity 
                            style={styles.button} 
                            onPress={handleActivacion}
                        >
                            <Text style={styles.buttonText}>SÍ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.button, styles.secondaryButton]} 
                            onPress={() => router.replace('/')}
                        >
                            <Text style={[styles.buttonText, styles.secondaryButtonText]}>NO</Text>
                        </TouchableOpacity>
                    </View>
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
        paddingTop: 40,
    },
    topSection: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },    
    icon: {
        width: 120,
        height: 120,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        padding: 30,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    title: {
        color: '#2B4F8C',
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitle: {
        color: '#2B4F8C',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
    },
    button: {
        flex: 1,
        backgroundColor: '#2B4F8C',
        paddingVertical: 14,
        marginHorizontal: 10,
        borderRadius: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#2B4F8C',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryButtonText: {
        color: '#2B4F8C',
    },
});
