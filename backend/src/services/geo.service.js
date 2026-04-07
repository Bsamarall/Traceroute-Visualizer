/**
 * ============================================================
 * geo.service.js - Geolocalização de IPs
 * ============================================================
 * Consulta a API ip-api.com para obter dados geográficos de IPs.
 * Implementa cache em memória e persistente (SQLite) para evitar
 * chamadas repetidas à API gratuita (limite: 45 req/min).
 *
 * Estratégia de cache em duas camadas:
 * 1. Cache em memória (NodeCache) - mais rápido, volátil
 * 2. Cache persistente (SQLite) - sobrevive restarts
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const db = require('../db/database');
const logger = require('../utils/logger');
const { isPrivateIP } = require('../utils/validator');

// ─── Cache em Memória ─────────────────────────────────────────────────────────

// TTL de 1 hora por padrão (geo de IPs raramente muda)
const GEO_CACHE_TTL = parseInt(process.env.GEO_CACHE_TTL) || 3600;
const memCache = new NodeCache({ stdTTL: GEO_CACHE_TTL, checkperiod: 600 });

// ─── API de Geolocalização ────────────────────────────────────────────────────

const GEO_API_URL = process.env.GEO_API_URL || 'http://ip-api.com/json';

// Campos que queremos da API (otimiza a resposta)
const GEO_FIELDS = 'status,message,city,country,countryCode,lat,lon,query';

// Dados de fallback para IPs sem geolocalização
const UNKNOWN_GEO = {
  city: 'Desconhecido',
  country: 'Desconhecido',
  country_code: '??',
  latitude: 0,
  longitude: 0,
};

// ─── Funções de Cache ─────────────────────────────────────────────────────────

/**
 * Busca dados geográficos do cache persistente (SQLite).
 * @param {string} ip
 * @returns {Object|null}
 */
function getFromDbCache(ip) {
  try {
    const stmt = db.prepare(`
      SELECT city, country, country_code, latitude, longitude
      FROM geo_cache 
      WHERE ip = ? AND cached_at > datetime('now', '-' || ? || ' seconds')
    `);
    return stmt.get(ip, GEO_CACHE_TTL) || null;
  } catch (err) {
    logger.error('Erro ao buscar geo cache do banco', { error: err.message });
    return null;
  }
}

/**
 * Salva dados geográficos no cache persistente.
 * @param {string} ip
 * @param {Object} geoData
 */
function saveToDbCache(ip, geoData) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO geo_cache (ip, city, country, country_code, latitude, longitude, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(ip, geoData.city, geoData.country, geoData.country_code, geoData.latitude, geoData.longitude);
  } catch (err) {
    logger.error('Erro ao salvar geo cache no banco', { error: err.message });
  }
}

// ─── Geolocalização ───────────────────────────────────────────────────────────

/**
 * Obtém dados de geolocalização para um único IP.
 * Verifica cache em memória → cache SQLite → API externa.
 *
 * @param {string} ip - Endereço IP para geolocalizarC
 * @returns {Promise<Object>} Dados geográficos
 */
async function getGeoData(ip) {
  // IPs privados/locais não têm geolocalização real
  if (!ip || isPrivateIP(ip)) {
    return { ...UNKNOWN_GEO, is_private: true };
  }

  // 1. Verifica cache em memória (mais rápido)
  const memCached = memCache.get(ip);
  if (memCached) {
    logger.debug(`Geo cache hit (memória): ${ip}`);
    return memCached;
  }

  // 2. Verifica cache no banco de dados
  const dbCached = getFromDbCache(ip);
  if (dbCached) {
    logger.debug(`Geo cache hit (banco): ${ip}`);
    memCache.set(ip, dbCached); // Popula cache em memória
    return dbCached;
  }

  // 3. Consulta API externa
  try {
    logger.debug(`Consultando geo API para: ${ip}`);
    
    const response = await axios.get(`${GEO_API_URL}/${ip}`, {
      params: { fields: GEO_FIELDS },
      timeout: 5000,
      // Não segue redirects desnecessários
      maxRedirects: 2,
    });

    const data = response.data;

    // Verifica se a API retornou sucesso
    if (data.status !== 'success') {
      logger.warn(`Geo API falhou para IP ${ip}: ${data.message}`);
      return UNKNOWN_GEO;
    }

    const geoData = {
      city: data.city || 'Desconhecido',
      country: data.country || 'Desconhecido',
      country_code: data.countryCode || '??',
      latitude: data.lat || 0,
      longitude: data.lon || 0,
    };

    // Salva nos dois níveis de cache
    memCache.set(ip, geoData);
    saveToDbCache(ip, geoData);

    return geoData;

  } catch (err) {
    // Erros de rede/timeout não devem derrubar o traceroute inteiro
    logger.warn(`Erro ao consultar geo para ${ip}: ${err.message}`);
    return UNKNOWN_GEO;
  }
}

/**
 * Geolocaliza múltiplos IPs em paralelo (com limite de concorrência).
 * Evita sobrecarregar a API gratuita.
 *
 * @param {string[]} ips - Array de IPs
 * @param {number} concurrency - Máximo de chamadas paralelas
 * @returns {Promise<Map<string, Object>>} Map de IP → dados geo
 */
async function batchGeoLookup(ips, concurrency = 5) {
  const results = new Map();
  const uniqueIps = [...new Set(ips.filter(Boolean))];

  // Processa em lotes para respeitar limite da API
  for (let i = 0; i < uniqueIps.length; i += concurrency) {
    const batch = uniqueIps.slice(i, i + concurrency);
    
    const promises = batch.map(async (ip) => {
      const geo = await getGeoData(ip);
      results.set(ip, geo);
    });

    await Promise.all(promises);

    // Pequena pausa entre lotes para não exceder rate limit da API gratuita
    if (i + concurrency < uniqueIps.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

module.exports = { getGeoData, batchGeoLookup };
