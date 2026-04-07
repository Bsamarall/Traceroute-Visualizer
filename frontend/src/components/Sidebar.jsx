/**
 * ============================================================
 * Sidebar.jsx - Barra lateral com controles e histórico
 * ============================================================
 * Lado esquerdo: Logo, botões de ação, créditos
 * Lado direito: Histórico recente de traces
 */

import styles from './Sidebar.module.css';

// ─── Ícones SVG ───────────────────────────────────────────────────────────────

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconHistory = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.9"/>
  </svg>
);

const IconInfo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const IconTarget = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

// ─── Sidebar Esquerda ─────────────────────────────────────────────────────────

export function LeftSidebar({ onNewTrace, onShowHistory, onShowCredits }) {
  return (
    <aside className={styles.leftSidebar}>
      {/* Logo / Branding */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>⬡</div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>TRACE</span>
          <span className={styles.logoSubtitle}>VISUALIZER</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Botões de Ação */}
      <nav className={styles.nav}>
        <button
          className={`${styles.navBtn} ${styles.navBtnPrimary}`}
          onClick={onNewTrace}
          title="Executar novo traceroute"
        >
          <IconPlus />
          <span>Nova Rota</span>
        </button>

        <button
          className={styles.navBtn}
          onClick={onShowHistory}
          title="Ver histórico de buscas"
        >
          <IconHistory />
          <span>Histórico</span>
        </button>

        <button
          className={styles.navBtn}
          onClick={onShowCredits}
          title="Créditos do projeto"
        >
          <IconInfo />
          <span>Créditos</span>
        </button>
      </nav>

      <div className={styles.spacer} />

      {/* Status do sistema */}
      <div className={styles.statusBar}>
        <div className={styles.statusDot} />
        <span className={styles.statusText}>SISTEMA ONLINE</span>
      </div>

      {/* Versão */}
      <div className={styles.version}>v1.0.0</div>
    </aside>
  );
}

// ─── Sidebar Direita (Histórico Recente) ─────────────────────────────────────

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}m atrás`;
  if (diffHr < 24) return `${diffHr}h atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function RightSidebar({ history = [], onSelectTrace, currentTraceId }) {
  return (
    <aside className={styles.rightSidebar}>
      <div className={styles.rightHeader}>
        <span className={styles.rightTitle}>HISTÓRICO</span>
        <span className={styles.rightCount}>{history.length}</span>
      </div>

      <div className={styles.historyList}>
        {history.length === 0 ? (
          <div className={styles.historyEmpty}>
            <p>Nenhuma busca ainda</p>
          </div>
        ) : (
          history.map((trace) => (
            <button
              key={trace.id}
              className={`${styles.historyItem} ${currentTraceId === trace.id ? styles.historyItemActive : ''}`}
              onClick={() => onSelectTrace(trace)}
              title={`Ver rota para ${trace.target}`}
            >
              <div className={styles.historyItemHeader}>
                <IconTarget />
                <span className={styles.historyTarget}>{trace.target}</span>
              </div>
              <div className={styles.historyMeta}>
                <span className={styles.historyHops}>{trace.total_hops} hops</span>
                <span className={styles.historyTime}>{formatTimeAgo(trace.created_at)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
