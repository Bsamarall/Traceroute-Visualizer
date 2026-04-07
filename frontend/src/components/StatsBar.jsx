/**
 * StatsBar.jsx - Barra superior com estatísticas do trace atual
 */

import styles from './StatsBar.module.css';
import { formatLatency, getLatencyInfo } from '../utils/latency';

export default function StatsBar({ trace }) {
  if (!trace) {
    return (
      <div className={styles.bar}>
        <div className={styles.idle}>
          <span className={styles.idleDot} />
          <span>Aguardando traceroute...</span>
        </div>
      </div>
    );
  }

  // Calcula estatísticas do trace
  const validHops = trace.hops.filter(h => h.rtt_ms !== null);
  const avgRtt = validHops.length
    ? validHops.reduce((s, h) => s + h.rtt_ms, 0) / validHops.length
    : null;
  const maxRtt = validHops.length ? Math.max(...validHops.map(h => h.rtt_ms)) : null;
  const timeoutCount = trace.hops.filter(h => h.is_timeout).length;

  const avgInfo = getLatencyInfo(avgRtt);

  return (
    <div className={styles.bar}>
      {/* Alvo */}
      <div className={styles.stat}>
        <span className={styles.statLabel}>DESTINO</span>
        <span className={styles.statValueTarget}>{trace.target}</span>
      </div>

      <div className={styles.sep} />

      {/* Total de hops */}
      <div className={styles.stat}>
        <span className={styles.statLabel}>HOPS</span>
        <span className={styles.statValue}>{trace.total_hops}</span>
      </div>

      <div className={styles.sep} />

      {/* Latência média */}
      <div className={styles.stat}>
        <span className={styles.statLabel}>LATÊNCIA MÉDIA</span>
        <span className={`${styles.statValue} ${avgInfo.className}`}>
          {formatLatency(avgRtt)}
        </span>
      </div>

      <div className={styles.sep} />

      {/* Latência máxima */}
      <div className={styles.stat}>
        <span className={styles.statLabel}>LATÊNCIA MÁX</span>
        <span className={`${styles.statValue} ${getLatencyInfo(maxRtt).className}`}>
          {formatLatency(maxRtt)}
        </span>
      </div>

      <div className={styles.sep} />

      {/* Timeouts */}
      <div className={styles.stat}>
        <span className={styles.statLabel}>TIMEOUTS</span>
        <span className={`${styles.statValue} ${timeoutCount > 0 ? styles.timeoutVal : ''}`}>
          {timeoutCount}
        </span>
      </div>

      <div className={styles.sep} />

      {/* Duração */}
      <div className={styles.stat}>
        <span className={styles.statLabel}>DURAÇÃO</span>
        <span className={styles.statValue}>
          {trace.duration_ms ? `${(trace.duration_ms / 1000).toFixed(1)}s` : '—'}
        </span>
      </div>
    </div>
  );
}
