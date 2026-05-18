/**
 * Callback cuando el backend responde 401 (token inválido o expirado).
 * Lo registra SessionNavigationGuard (cierre + login). Login no dispara esto.
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
