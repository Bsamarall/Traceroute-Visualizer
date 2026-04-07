/**
 * latency.js - Utilitários para classificação de latência
 * Usados tanto na tabela quanto no globo para colorir hops
 */

/**
 * Classifica a latência e retorna objeto com classe CSS e cor hex.
 * @param {number|null} rtt - Round trip time em ms
 * @returns {{ className: string, color: string, label: string }}
 */
export function getLatencyInfo(rtt) {
  if (rtt === null || rtt === undefined) {
    return { className: 'latency-timeout', color: '#64748b', label: 'timeout' };
  }
  if (rtt < 50) {
    return { className: 'latency-good', color: '#00ff88', label: `${rtt.toFixed(1)}ms` };
  }
  if (rtt < 150) {
    return { className: 'latency-medium', color: '#fbbf24', label: `${rtt.toFixed(1)}ms` };
  }
  if (rtt < 300) {
    return { className: 'latency-high', color: '#f97316', label: `${rtt.toFixed(1)}ms` };
  }
  return { className: 'latency-critical', color: '#ff4444', label: `${rtt.toFixed(1)}ms` };
}

/**
 * Retorna apenas a cor hex para uso no globo 3D.
 * @param {number|null} rtt
 * @returns {string} Cor hexadecimal
 */
export function getLatencyColor(rtt) {
  return getLatencyInfo(rtt).color;
}

/**
 * Formata a latência para exibição.
 * @param {number|null} rtt
 * @returns {string}
 */
export function formatLatency(rtt) {
  if (rtt === null || rtt === undefined) return '* * *';
  return `${rtt.toFixed(1)} ms`;
}
