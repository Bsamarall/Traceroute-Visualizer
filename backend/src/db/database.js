/**
 * ============================================================
 * database.js - Configuração e inicialização do SQLite
 * ============================================================
 * Responsável por criar e gerenciar a conexão com o banco de
 * dados local SQLite, criando as tabelas necessárias caso não
 * existam.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Caminho do banco configurável via .env
const DB_PATH = process.env.DB_PATH || './data/traceroute.db';
const DB_DIR = path.dirname(path.resolve(DB_PATH));

// Garante que o diretório existe antes de criar o banco
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  logger.info(`Diretório do banco criado: ${DB_DIR}`);
}

// Cria/abre a conexão com o banco SQLite
const db = new Database(path.resolve(DB_PATH));

// Habilita WAL mode para melhor performance com leituras concorrentes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Inicializa o schema do banco de dados.
 * Cria as tabelas se não existirem.
 */
function initializeDatabase() {
  // Tabela principal de traces executados
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id          TEXT PRIMARY KEY,           -- UUID único para cada trace
      target      TEXT NOT NULL,              -- IP ou domínio alvo
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      status      TEXT DEFAULT 'pending',     -- pending | completed | failed
      total_hops  INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0           -- tempo total da operação
    );
  `);

  // Tabela de hops individuais de cada trace
  db.exec(`
    CREATE TABLE IF NOT EXISTS hops (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id    TEXT NOT NULL,              -- FK para traces.id
      hop_number  INTEGER NOT NULL,           -- número sequencial do hop
      ip          TEXT,                       -- IP do roteador
      hostname    TEXT,                       -- hostname resolvido
      city        TEXT,                       -- cidade (geolocalização)
      country     TEXT,                       -- país (geolocalização)
      country_code TEXT,                      -- código do país (ex: BR, US)
      latitude    REAL,                       -- latitude GPS
      longitude   REAL,                       -- longitude GPS
      rtt_ms      REAL,                       -- Round Trip Time em ms
      is_private  INTEGER DEFAULT 0,          -- 1 se IP privado/local
      is_timeout  INTEGER DEFAULT 0,          -- 1 se hop não respondeu
      FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE
    );
  `);

  // Tabela de cache de geolocalização para evitar chamadas repetidas à API
  db.exec(`
    CREATE TABLE IF NOT EXISTS geo_cache (
      ip          TEXT PRIMARY KEY,           -- IP como chave do cache
      city        TEXT,
      country     TEXT,
      country_code TEXT,
      latitude    REAL,
      longitude   REAL,
      cached_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Índices para melhorar performance das queries mais comuns
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hops_trace_id ON hops(trace_id);
    CREATE INDEX IF NOT EXISTS idx_traces_created_at ON traces(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_geo_cache_ip ON geo_cache(ip);
  `);

  logger.info('Banco de dados inicializado com sucesso');
}

// Executa a inicialização ao importar o módulo
initializeDatabase();

module.exports = db;
