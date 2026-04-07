/**
 * ============================================================
 * traceroute.service.js - Execução segura do traceroute
 * ============================================================
 * Responsável por:
 * 1. Executar o traceroute de forma segura (sem shell injection)
 * 2. Fazer parse da saída para estrutura de dados
 * 3. Suportar Linux (traceroute) e macOS (traceroute) e Windows (tracert)
 *
 * ⚠️ SEGURANÇA: Nunca usa shell: true nem interpola strings no comando.
 *    Usa spawn com array de argumentos para prevenir injeção.
 */

const { spawn } = require('child_process');
const os = require('os');
const logger = require('../utils/logger');
const { isPrivateIP } = require('../utils/validator');

// ─── Configurações ────────────────────────────────────────────────────────────

const MAX_HOPS = parseInt(process.env.TRACEROUTE_MAX_HOPS) || 30;
const TIMEOUT_MS = parseInt(process.env.TRACEROUTE_TIMEOUT_MS) || 30000;
const platform = os.platform();

// ─── Detecção do comando por plataforma ──────────────────────────────────────

/**
 * Retorna o comando e argumentos adequados para cada plataforma.
 * ⚠️ SEGURANÇA: target já foi validado pelo validator.js antes de chegar aqui.
 *
 * @param {string} target - IP ou domínio validado
 * @returns {{ cmd: string, args: string[] }}
 */
function getTracerouteCommand(target) {
  if (platform === 'win32') {
    // Windows: tracert
    return {
      cmd: 'tracert',
      args: ['-h', String(MAX_HOPS), '-w', '3000', target],
    };
  } else {
    // Linux/macOS: traceroute
    // -n: não resolver hostnames (mais rápido e seguro)
    // -m: máximo de hops
    // -w: timeout por hop em segundos
    // -q: número de queries por hop (1 = mais rápido)
    return {
      cmd: 'traceroute',
      args: ['-n', '-m', String(MAX_HOPS), '-w', '3', '-q', '1', target],
    };
  }
}

// ─── Parser da saída ──────────────────────────────────────────────────────────

/**
 * Faz parse de uma linha de saída do traceroute Linux/macOS.
 * Formato esperado: " 1  192.168.1.1  1.234 ms"
 *
 * @param {string} line - Linha da saída
 * @returns {Object|null} Objeto do hop ou null se inválido
 */
function parseTracerouteLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Padrão para hop com IP e RTT
  // Ex: "  1  192.168.1.1  1.234 ms"
  const hopPattern = /^\s*(\d+)\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\*)\s+([\d.]+\s+ms|\*)$/;
  
  // Padrão alternativo com múltiplos RTTs
  // Ex: "  1  192.168.1.1  1.0 ms  1.2 ms  0.9 ms"
  const multiRttPattern = /^\s*(\d+)\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([\d.]+)\s+ms/;
  
  // Timeout/sem resposta
  const timeoutPattern = /^\s*(\d+)\s+\*\s*(\*\s*)*$/;

  let match;

  // Tenta padrão com múltiplos RTTs primeiro (mais comum)
  match = multiRttPattern.exec(trimmed);
  if (match) {
    return {
      hop_number: parseInt(match[1]),
      ip: match[2],
      rtt_ms: parseFloat(match[3]),
      is_timeout: false,
      is_private: isPrivateIP(match[2]),
    };
  }

  // Tenta padrão simples
  match = hopPattern.exec(trimmed);
  if (match) {
    const isTimeout = match[2] === '*' || match[3] === '*';
    return {
      hop_number: parseInt(match[1]),
      ip: isTimeout ? null : match[2],
      rtt_ms: isTimeout ? null : parseFloat(match[3]),
      is_timeout: isTimeout,
      is_private: isTimeout ? false : isPrivateIP(match[2]),
    };
  }

  // Timeout explícito
  match = timeoutPattern.exec(trimmed);
  if (match) {
    return {
      hop_number: parseInt(match[1]),
      ip: null,
      rtt_ms: null,
      is_timeout: true,
      is_private: false,
    };
  }

  return null;
}

/**
 * Faz parse de uma linha do tracert do Windows.
 * Formato: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
 *
 * @param {string} line - Linha da saída do Windows
 * @returns {Object|null}
 */
function parseTracertLine(line) {
  const trimmed = line.trim();
  if (!trimmed || !/^\d+/.test(trimmed)) return null;

  // Padrão Windows com IP
  const pattern = /^\s*(\d+)\s+(?:<?\d+\s+ms\s+){1,3}(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
  const timeoutPattern = /^\s*(\d+)\s+\*\s+\*\s+\*\s+Timeout/i;

  let match = pattern.exec(trimmed);
  if (match) {
    // Extrai primeiro RTT disponível
    const rttMatch = /(\d+)\s*ms/.exec(trimmed);
    return {
      hop_number: parseInt(match[1]),
      ip: match[2],
      rtt_ms: rttMatch ? parseFloat(rttMatch[1]) : null,
      is_timeout: false,
      is_private: isPrivateIP(match[2]),
    };
  }

  match = timeoutPattern.exec(trimmed);
  if (match) {
    return {
      hop_number: parseInt(match[1]),
      ip: null,
      rtt_ms: null,
      is_timeout: true,
      is_private: false,
    };
  }

  return null;
}

// ─── Executor Principal ───────────────────────────────────────────────────────

/**
 * Executa o traceroute de forma segura e retorna os hops parseados.
 *
 * @param {string} target - IP ou domínio (já validado)
 * @returns {Promise<Array>} Array de hops
 */
async function executeTraceroute(target) {
  return new Promise((resolve, reject) => {
    const { cmd, args } = getTracerouteCommand(target);
    
    logger.info(`Iniciando traceroute para: ${target}`, { cmd, args });

    const hops = [];
    let rawOutput = '';
    let errorOutput = '';
    let finished = false;

    // ⚠️ SEGURANÇA: spawn sem shell:true, argumentos como array separado
    // Isso garante que o target não pode conter comandos injetados
    const proc = spawn(cmd, args, {
      shell: false,        // CRÍTICO: nunca true
      timeout: TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Timeout de segurança adicional
    const killTimer = setTimeout(() => {
      if (!finished) {
        logger.warn(`Traceroute timeout após ${TIMEOUT_MS}ms para: ${target}`);
        proc.kill('SIGTERM');
      }
    }, TIMEOUT_MS);

    // Coleta stdout linha por linha
    proc.stdout.on('data', (chunk) => {
      rawOutput += chunk.toString();
      
      // Processa linhas completas (terminadas em \n)
      const lines = rawOutput.split('\n');
      rawOutput = lines.pop(); // Mantém linha incompleta para próximo chunk
      
      for (const line of lines) {
        const parsed = platform === 'win32'
          ? parseTracertLine(line)
          : parseTracerouteLine(line);
          
        if (parsed) {
          hops.push(parsed);
          logger.debug(`Hop ${parsed.hop_number}: ${parsed.ip || '*'} (${parsed.rtt_ms || 'timeout'}ms)`);
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    proc.on('close', (code) => {
      finished = true;
      clearTimeout(killTimer);

      // Processa linha final se houver
      if (rawOutput.trim()) {
        const parsed = platform === 'win32'
          ? parseTracertLine(rawOutput)
          : parseTracerouteLine(rawOutput);
        if (parsed) hops.push(parsed);
      }

      logger.info(`Traceroute concluído para ${target}: ${hops.length} hops`, { exitCode: code });

      if (hops.length === 0 && errorOutput) {
        logger.error(`Traceroute falhou para ${target}`, { error: errorOutput });
        return reject(new Error(`Traceroute falhou: ${errorOutput.substring(0, 200)}`));
      }

      resolve(hops);
    });

    proc.on('error', (err) => {
      finished = true;
      clearTimeout(killTimer);
      
      // Comando não encontrado - provavelmente traceroute não está instalado
      if (err.code === 'ENOENT') {
        logger.error(`Comando '${cmd}' não encontrado. Instale traceroute.`);
        return reject(new Error(`Comando '${cmd}' não encontrado. Execute: apt-get install traceroute`));
      }
      
      logger.error(`Erro ao executar traceroute`, { error: err.message });
      reject(err);
    });
  });
}

module.exports = { executeTraceroute };
