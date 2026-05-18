import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useCustomModal } from '../hooks/useCustomModal';
import { setOnSessionExpired } from '../services/SessionExpiredHandler';
import CustomModal from './CustomModal';

/** Rutas sin sesión completa: no forzar cierre por tiempo de token aquí. */
const PUBLIC_ROUTES = new Set(['/', '/login', '/reactivar']);

const SESION_FINALIZADA_TITULO = 'Sesión finalizada';
const SESION_FINALIZADA_MENSAJE =
  'Tu sesión se cerró por seguridad. Esto no indica un error en la aplicación. Vuelve a iniciar sesión para continuar.';

export default function SessionNavigationGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, checkSessionExpired, setUserData } = useContext(AuthContext);
  const lastExpireRef = useRef(0);
  const { modalVisible, modalData, mostrarAdvertencia, cerrarModal } = useCustomModal();

  const performSessionExpired = useCallback(() => {
    const now = Date.now();
    if (now - lastExpireRef.current < 1500) return;
    lastExpireRef.current = now;

    (async () => {
      try {
        await AsyncStorage.removeItem('authToken');
      } catch (e) {
        // ignore
      }
      setUserData(null);
      router.replace('/');
      // Tras la navegación, mostrar modal de advertencia (mismo patrón que con Alert).
      setTimeout(() => {
        mostrarAdvertencia(SESION_FINALIZADA_TITULO, SESION_FINALIZADA_MENSAJE);
      }, 400);
    })();
  }, [router, setUserData, mostrarAdvertencia]);

  useEffect(() => {
    setOnSessionExpired(performSessionExpired);
    return () => setOnSessionExpired(null);
  }, [performSessionExpired]);

  useEffect(() => {
    if (!userData) return;
    if (PUBLIC_ROUTES.has(pathname)) return;
    if (!checkSessionExpired()) return;
    performSessionExpired();
  }, [pathname, userData, checkSessionExpired, performSessionExpired]);

  return (
    <CustomModal
      visible={modalVisible}
      title={modalData.title}
      message={modalData.message}
      type={modalData.type}
      buttonText={modalData.buttonText}
      onClose={cerrarModal}
    />
  );
}
