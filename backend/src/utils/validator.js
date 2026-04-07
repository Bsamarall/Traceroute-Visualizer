/**
 * ============================================================
 * validator.js - Validação e sanitização de inputs
 * ============================================================
 * SEGURANÇA CRÍTICA: Este módulo previne command injection e
 * garante que apenas alvos legítimos sejam processados.
 *
 * Validações implementadas:
 * - Formato de IP (IPv4 e IPv6)
 * - Formato de domínio (RFC 1123)
 * - Prevenção de command injection
 * - Bloqueio de IPs/domínios internos (opcional)
 */

const logger = require('./logger');

// ─── Regex Patterns ──────────────────────────────────────────────────────────

/**
 * Valida IPv4 no formato X.X.X.X onde X está entre 0-255
 */
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * Valida IPv6 em formato completo ou comprimido
 */
const IPV6_REGEX = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::)$/;

/**
 * Valida nomes de domínio seguindo RFC 1123
 * Permite: letras, números, hífens e pontos
 * Máximo 253 caracteres no total
 */
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

/**
 * Caracteres perigosos para command injection
 * Detecta: ;, |, &, `, $, (, ), {, }, <, >, \n, \r, null bytes
 */
const DANGEROUS_CHARS_REGEX = /[;&|`$(){}<>\n\r\0\\'"]/;

// ─── Funções de Validação ─────────────────────────────────────────────────────

/**
 * Verifica se um string contém caracteres de injeção de comandos.
 * @param {string} input - String a verificar
 * @returns {boolean} true se perigoso
 */
function hasDangerousChars(input) {
  return DANGEROUS_CHARS_REGEX.test(input);
}

/**
 * Verifica se um IPv4 é válido (não apenas formato, mas valores).
 * @param {string} ip - IPv4 para validar
 * @returns {boolean}
 */
function isValidIPv4(ip) {
  if (!IPV4_REGEX.test(ip)) return false;
  
  // Valida cada octeto (deve estar entre 0 e 255)
  const octets = ip.split('.').map(Number);
  return octets.every(o => o >= 0 && o <= 255);
}

/**
 * Verifica se um IPv6 é válido.
 * @param {string} ip - IPv6 para validar
 * @returns {boolean}
 */
function isValidIPv6(ip) {
  return IPV6_REGEX.test(ip);
}

/**
 * Verifica se um domínio é válido.
 * @param {string} domain - Domínio para validar
 * @returns {boolean}
 */
function isValidDomain(domain) {
  if (domain.length > 253) return false;
  return DOMAIN_REGEX.test(domain);
}

/**
 * Verifica se um IP é privado/loopback (RFC 1918).
 * Usamos isso para geolocalização (IPs privados não têm geo).
 * @param {string} ip - IP para verificar
 * @returns {boolean}
 */
function isPrivateIP(ip) {
  if (!isValidIPv4(ip)) return false;
  
  const octets = ip.split('.').map(Number);
  const [a, b] = octets;
  
  return (
    a === 10 ||                           // 10.0.0.0/8
    a === 127 ||                          // 127.0.0.0/8 (loopback)
    (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12
    (a === 192 && b === 168) ||           // 192.168.0.0/16
    (a === 169 && b === 254) ||           // 169.254.0.0/16 (link-local)
    (a === 0)                             // 0.0.0.0/8
  );
}

/**
 * Valida e sanitiza o alvo do traceroute.
 * Esta é a função principal de segurança do backend.
 *
 * @param {string} target - IP ou domínio inserido pelo usuário
 * @returns {{ valid: boolean, type: string|null, sanitized: string|null, error: string|null }}
 */
function validateTarget(target) {
  // Verificação básica de tipo e existência
  if (!target || typeof target !== 'string') {
    return { valid: false, error: 'Alvo é obrigatório e deve ser uma string' };
  }

  // Remove espaços em branco das bordas
  const trimmed = target.trim();

  // Verifica tamanho mínimo e máximo
  if (trimmed.length < 2) {
    return { valid: false, error: 'Alvo muito curto' };
  }
  if (trimmed.length > 253) {
    return { valid: false, error: 'Alvo muito longo (máximo 253 caracteres)' };
  }

  // ⚠️ SEGURANÇA: verifica command injection antes de qualquer outra coisa
  if (hasDangerousChars(trimmed)) {
    logger.warn(`Tentativa de command injection detectada: "${trimmed.substring(0, 50)}"`);
    return { valid: false, error: 'Alvo contém caracteres inválidos' };
  }

  // Valida como IPv4
  if (isValidIPv4(trimmed)) {
    return { valid: true, type: 'ipv4', sanitized: trimmed };
  }

  // Valida como IPv6
  if (isValidIPv6(trimmed)) {
    return { valid: true, type: 'ipv6', sanitized: trimmed };
  }

  // Valida como domínio
  if (isValidDomain(trimmed)) {
    // Converte para lowercase (domínios são case-insensitive)
    return { valid: true, type: 'domain', sanitized: trimmed.toLowerCase() };
  }

  return { valid: false, error: 'Formato inválido. Use um IP ou domínio válido (ex: 8.8.8.8 ou google.com)' };
}

module.exports = {
  validateTarget,
  isPrivateIP,
  isValidIPv4,
  isValidIPv6,
  isValidDomain,
};
