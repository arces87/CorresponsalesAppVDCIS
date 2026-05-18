import { jwtDecode } from 'jwt-decode';

/**
 * Lee el claim `exp` del JWT (segundos UTC) y lo devuelve en milisegundos para comparar con Date.now().
 * @param {string|null|undefined} token
 * @returns {number|null}
 */
export function getTokenExpirationMs(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = jwtDecode(token);
    const exp = payload?.exp;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}
