import { useState } from 'react';

/**
 * Hook personalizado para manejar el CustomModal de forma sencilla
 * 
 * @returns {Object} Objeto con funciones y estados para manejar el modal
 */
export function useCustomModal() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({
    title: '',
    message: '',
    type: 'info',
    buttonText: 'OK',
  });

  /**
   * Muestra el modal con los datos especificados
   * @param {string} title - Título del modal
   * @param {string} message - Mensaje del modal
   * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
   * @param {string} buttonText - Texto del botón (opcional)
   */
  const mostrarModal = (title, message, type = 'info', buttonText = 'OK') => {
    setModalData({ title, message, type, buttonText });
    setModalVisible(true);
  };

  /**
   * Cierra el modal
   */
  const cerrarModal = () => {
    setModalVisible(false);
  };

  /**
   * Muestra un modal de éxito
   */
  const mostrarExito = (title, message) => {
    mostrarModal(title, message, 'success');
  };

  /**
   * Muestra un modal de error
   * Procesa solo prefijos técnicos tipo "Error 400:" sin recortar mensajes de negocio
   */
  const mostrarError = (title, message) => {
    let processedMessage = message;
    
    // Solo eliminar el prefijo si es un error técnico con código HTTP.
    if (typeof message === 'string' && /^Error\s+\d+:\s*/i.test(message)) {
      processedMessage = message.replace(/^Error\s+\d+:\s*/i, '').trim();
    }
    
    mostrarModal(title, processedMessage, 'error');
  };

  /**
   * Muestra un modal de advertencia
   */
  const mostrarAdvertencia = (title, message) => {
    mostrarModal(title, message, 'warning');
  };

  /**
   * Muestra un modal de información
   */
  const mostrarInfo = (title, message) => {
    mostrarModal(title, message, 'info');
  };

  return {
    modalVisible,
    modalData,
    mostrarModal,
    cerrarModal,
    mostrarExito,
    mostrarError,
    mostrarAdvertencia,
    mostrarInfo,
  };
}
