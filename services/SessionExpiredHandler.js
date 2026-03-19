/**
 * Permite registrar un callback que se ejecuta cuando el backend responde 401/403
 * (sesión/token expirado). El layout de la app registra aquí el cierre de sesión y redirección.
 */
let onSessionExpired = null;

export function setOnSessionExpired(callback) {
  onSessionExpired = callback;
}

export function triggerSessionExpired() {
  if (typeof onSessionExpired === 'function') {
    onSessionExpired();
  }
}
