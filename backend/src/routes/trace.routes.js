/**
 * ============================================================
 * trace.routes.js - Endpoints de traceroute
 * ============================================================
 * Define as rotas:
 * - POST /api/trace      → Executa novo traceroute
 * - GET  /api/history    → Retorna histórico
 * - GET  /api/trace/:id  → Retorna trace específico
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const db = require('../db/database');
const { validateTarget } = require('../utils/validator');
const { executeTraceroute } = require('../services/traceroute.service');
const { batchGeoLookup } = require('../services/geo.service');
const logger = require('../utils/logger');

// ─── POST /api/trace ──────────────────────────────────────────────────────────

/**
 * Executa um novo traceroute para o alvo especificado.
 *
 * Body: { target: "google.com" }
 *
 * Retorna JSON estruturado com todos os hops geolocalizados.
 */
router.post('/trace', async (req, res) => {
  const startTime = Date.now();

  // ── Validação do input ────────────────────────────────────────────────────
  const { target } = req.body;
  const validation = validateTarget(target);

  if (!validation.valid) {
    logger.warn(`Input inválido na rota /trace`, { target: String(target).substring(0, 50) });
    return res.status(400).json({
      error: 'Alvo inválido',
      message: validation.error,
    });
  }

  const sanitizedTarget = validation.sanitized;
  const traceId = uuidv4();

  // ── Registra trace no banco ───────────────────────────────────────────────
  try {
    db.prepare(`
      INSERT INTO traces (id, target, status) VALUES (?, ?, 'pending')
    `).run(traceId, sanitizedTarget);
  } catch (dbErr) {
    logger.error('Erro ao criar registro de trace', { error: dbErr.message });
    return res.status(500).json({ error: 'Erro interno ao iniciar trace' });
  }

  // ── Executa traceroute ────────────────────────────────────────────────────
  let hops;
  try {
    hops = await executeTraceroute(sanitizedTarget);
  } catch (traceErr) {
    // Atualiza status para falha no banco
    db.prepare(`UPDATE traces SET status = 'failed' WHERE id = ?`).run(traceId);

    logger.error(`Traceroute falhou para ${sanitizedTarget}`, { error: traceErr.message });
    return res.status(500).json({
      error: 'Traceroute falhou',
      message: traceErr.message,
    });
  }

  // ── Geolocaliza todos os IPs em paralelo ──────────────────────────────────
  const validIps = hops.filter(h => h.ip && !h.is_private).map(h => h.ip);
  const geoMap = await batchGeoLookup(validIps);

  // ── Monta hops com dados geográficos ──────────────────────────────────────
  const enrichedHops = hops.map(hop => {
    const geo = hop.ip ? (geoMap.get(hop.ip) || {}) : {};
    return {
      hop_number: hop.hop_number,
      ip: hop.ip || null,
      hostname: hop.hostname || null,
      city: geo.city || (hop.is_private ? 'Rede Local' : 'Desconhecido'),
      country: geo.country || (hop.is_private ? 'Privado' : 'Desconhecido'),
      country_code: geo.country_code || '??',
      latitude: geo.latitude || null,
      longitude: geo.longitude || null,
      rtt_ms: hop.rtt_ms || null,
      is_private: hop.is_private || false,
      is_timeout: hop.is_timeout || false,
    };
  });

  // ── Persiste hops no banco ────────────────────────────────────────────────
  const insertHop = db.prepare(`
    INSERT INTO hops (
      trace_id, hop_number, ip, hostname, city, country, country_code,
      latitude, longitude, rtt_ms, is_private, is_timeout
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Usa transação para inserir todos os hops atomicamente
  const insertAllHops = db.transaction((hopsToInsert) => {
    for (const hop of hopsToInsert) {
      insertHop.run(
        traceId,
        hop.hop_number,
        hop.ip,
        hop.hostname,
        hop.city,
        hop.country,
        hop.country_code,
        hop.latitude,
        hop.longitude,
        hop.rtt_ms,
        hop.is_private ? 1 : 0,
        hop.is_timeout ? 1 : 0,
      );
    }
  });

  try {
    insertAllHops(enrichedHops);
  } catch (dbErr) {
    logger.error('Erro ao salvar hops', { error: dbErr.message });
    // Não falha a requisição, apenas loga
  }

  // ── Atualiza status do trace ──────────────────────────────────────────────
  const duration = Date.now() - startTime;
  db.prepare(`
    UPDATE traces 
    SET status = 'completed', total_hops = ?, duration_ms = ?
    WHERE id = ?
  `).run(enrichedHops.length, duration, traceId);

  logger.info(`Trace concluído`, {
    target: sanitizedTarget,
    hops: enrichedHops.length,
    duration_ms: duration,
  });

  // ── Resposta ──────────────────────────────────────────────────────────────
  return res.json({
    id: traceId,
    target: sanitizedTarget,
    hops: enrichedHops,
    total_hops: enrichedHops.length,
    duration_ms: duration,
    created_at: new Date().toISOString(),
  });
});

// ─── GET /api/history ─────────────────────────────────────────────────────────

/**
 * Retorna o histórico das últimas N buscas.
 * Query params: limit (padrão 10, máximo 50)
 */
router.get('/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  try {
    const traces = db.prepare(`
      SELECT id, target, created_at, status, total_hops, duration_ms
      FROM traces
      WHERE status = 'completed'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    return res.json({ traces, total: traces.length });
  } catch (err) {
    logger.error('Erro ao buscar histórico', { error: err.message });
    return res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// ─── GET /api/trace/:id ───────────────────────────────────────────────────────

/**
 * Retorna os detalhes completos de um trace específico pelo ID.
 */
router.get('/trace/:id', (req, res) => {
  const { id } = req.params;

  // Validação básica do ID (deve ser UUID)
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const trace = db.prepare(`
      SELECT * FROM traces WHERE id = ?
    `).get(id);

    if (!trace) {
      return res.status(404).json({ error: 'Trace não encontrado' });
    }

    const hops = db.prepare(`
      SELECT * FROM hops WHERE trace_id = ? ORDER BY hop_number ASC
    `).all(id);

    return res.json({ ...trace, hops });
  } catch (err) {
    logger.error('Erro ao buscar trace', { error: err.message, traceId: id });
    return res.status(500).json({ error: 'Erro ao buscar trace' });
  }
});

// ─── GET /api/health ──────────────────────────────────────────────────────────

/**
 * Health check endpoint para monitoramento e uptime checks.
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

module.exports = router;
