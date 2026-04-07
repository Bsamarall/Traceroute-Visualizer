/**
 * ============================================================
 * HopTable.jsx - Tabela detalhada dos hops do traceroute
 * ============================================================
 * Exibe cada hop com:
 * - Número, IP, cidade, país, latência (colorida)
 * - Indicador visual de hop com alta latência
 * - Animação de entrada progressiva
 */

import { getLatencyInfo, formatLatency } from '../utils/latency';
import styles from './HopTable.module.css';

// ─── Ícones inline (SVG) ──────────────────────────────────────────────────────

const IconAlert = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconLock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconTimeout = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ─── Sub-componente: linha da tabela ──────────────────────────────────────────

function HopRow({ hop, index }) {
  const latencyInfo = getLatencyInfo(hop.rtt_ms);
  const isHighLatency = hop.rtt_ms !== null && hop.rtt_ms > 150;

  return (
    <tr
      className={`${styles.row} ${isHighLatency ? styles.rowHighLatency : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Número do hop */}
      <td className={styles.cellHopNum}>
        <span className={styles.hopNumber}>{hop.hop_number}</span>
      </td>

      {/* IP */}
      <td className={styles.cellIp}>
        {hop.is_timeout ? (
          <span className={styles.timeout}>
            <IconTimeout /> * * *
          </span>
        ) : hop.is_private ? (
          <span className={styles.privateIp}>
            <IconLock />
            <code>{hop.ip}</code>
          </span>
        ) : (
          <code className={styles.ipCode}>{hop.ip || '—'}</code>
        )}
      </td>

      {/* Localização */}
      <td className={styles.cellLocation}>
        {hop.is_timeout ? (
          <span className={styles.muted}>—</span>
        ) : hop.is_private ? (
          <span className={styles.privateLabel}>Rede Local</span>
        ) : (
          <div className={styles.locationInfo}>
            {hop.country_code && hop.country_code !== '??' && (
              <img
                src={`https://flagcdn.com/16x12/${hop.country_code.toLowerCase()}.png`}
                alt={hop.country}
                className={styles.flag}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <span className={styles.city}>{hop.city || '—'}</span>
            {hop.country && hop.country !== 'Desconhecido' && (
              <span className={styles.country}>{hop.country}</span>
            )}
          </div>
        )}
      </td>

      {/* Latência */}
      <td className={styles.cellLatency}>
        <div className={styles.latencyWrapper}>
          {/* Barra visual de latência */}
          {hop.rtt_ms !== null && (
            <div
              className={styles.latencyBar}
              style={{
                width: `${Math.min((hop.rtt_ms / 400) * 100, 100)}%`,
                backgroundColor: latencyInfo.color,
              }}
            />
          )}
          <span className={`latency-badge ${latencyInfo.className}`}>
            {formatLatency(hop.rtt_ms)}
          </span>
          {/* Ícone de alerta para alta latência */}
          {isHighLatency && (
            <span className={styles.alertIcon} title="Alta latência detectada">
              <IconAlert />
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function HopTable({ hops = [], loading = false }) {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <span className={styles.loadingText}>Executando traceroute...</span>
      </div>
    );
  }

  if (hops.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>⌖</div>
        <p>Execute um traceroute para visualizar os hops</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableHeader}>
        <span className={styles.tableTitle}>ROTA DETALHADA</span>
        <span className={styles.hopCount}>{hops.length} hops</span>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.thead}>
              <th className={styles.thHop}>#</th>
              <th className={styles.thIp}>ENDEREÇO IP</th>
              <th className={styles.thLocation}>LOCALIZAÇÃO</th>
              <th className={styles.thLatency}>LATÊNCIA</th>
            </tr>
          </thead>
          <tbody>
            {hops.map((hop, idx) => (
              <HopRow key={`${hop.hop_number}-${hop.ip}`} hop={hop} index={idx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
