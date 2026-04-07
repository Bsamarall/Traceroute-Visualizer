/**
 * ============================================================
 * App.jsx - Componente principal do Traceroute Visualizer
 * ============================================================
 * Gerencia o estado global da aplicação:
 * - Execução de traces
 * - Histórico
 * - Modais
 * - Geolocalização do usuário
 *
 * Layout:
 * ┌──────────────────────────────────────┐
 * │  StatsBar (topo)                     │
 * ├──────────┬──────────────┬────────────┤
 * │LeftSidebar│   Globo 3D  │RightSidebar│
 * │          │              │            │
 * │          ├──────────────┤            │
 * │          │  HopTable    │            │
 * └──────────┴──────────────┴────────────┘
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Componentes ──────────────────────────────────────────────────────────────
import Globe3D from './components/Globe3D';
import HopTable from './components/HopTable';
import { LeftSidebar, RightSidebar } from './components/Sidebar';
import TraceModal from './components/TraceModal';
import CreditsModal from './components/CreditsModal';
import StatsBar from './components/StatsBar';

// ─── Hooks e Utils ────────────────────────────────────────────────────────────
import { useGeolocation } from './hooks/useGeolocation';
import { runTrace, getHistory, getTrace } from './utils/api';

// ─── Estilos ──────────────────────────────────────────────────────────────────
import styles from './App.module.css';

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function App() {
  // ── Estado da aplicação ────────────────────────────────────────────────────
  const [currentTrace, setCurrentTrace] = useState(null);   // Trace atual exibido
  const [history, setHistory] = useState([]);               // Histórico de traces
  const [isLoading, setIsLoading] = useState(false);        // Loading do traceroute
  const [isAnimating, setIsAnimating] = useState(false);    // Animação do globo
  const [error, setError] = useState(null);                 // Mensagem de erro global

  // ── Estado dos modais ──────────────────────────────────────────────────────
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  // ── Geolocalização do usuário ──────────────────────────────────────────────
  const { location: userLocation } = useGeolocation();

  // ── Carrega histórico ao iniciar ───────────────────────────────────────────
  useEffect(() => {
    loadHistory();
  }, []);

  /**
   * Carrega o histórico de traces do backend.
   */
  const loadHistory = useCallback(async () => {
    try {
      const data = await getHistory(15);
      setHistory(data.traces || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err.message);
    }
  }, []);

  /**
   * Executa um novo traceroute.
   * @param {string} target - IP ou domínio validado
   */
  const handleRunTrace = useCallback(async (target) => {
    setIsLoading(true);
    setError(null);
    setShowTraceModal(false);
    setCurrentTrace(null);

    try {
      const result = await runTrace(target);
      
      // Ativa animação progressiva no globo
      setIsAnimating(true);
      setCurrentTrace(result);

      // Desativa animação após os hops terem sido exibidos
      setTimeout(() => setIsAnimating(false), result.hops.length * 600 + 1000);

      // Atualiza histórico
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Erro ao executar traceroute');
    } finally {
      setIsLoading(false);
    }
  }, [loadHistory]);

  /**
   * Carrega um trace do histórico para exibição.
   * @param {Object} traceInfo - Info básica do trace (sem hops)
   */
  const handleSelectHistoryTrace = useCallback(async (traceInfo) => {
    // Se já está exibindo este trace, não faz nada
    if (currentTrace?.id === traceInfo.id) return;

    try {
      setIsLoading(true);
      const fullTrace = await getTrace(traceInfo.id);
      setIsAnimating(false); // Sem animação para histórico
      setCurrentTrace(fullTrace);
    } catch (err) {
      setError('Erro ao carregar trace do histórico');
    } finally {
      setIsLoading(false);
    }
  }, [currentTrace]);

  /**
   * Limpa o erro após um tempo.
   */
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className={`${styles.app} grid-bg`}>
      {/* ── Barra superior de estatísticas ──────────────────────────── */}
      <StatsBar trace={currentTrace} />

      {/* ── Layout principal ─────────────────────────────────────────── */}
      <div className={styles.main}>
        {/* Sidebar esquerda */}
        <LeftSidebar
          onNewTrace={() => setShowTraceModal(true)}
          onShowHistory={loadHistory}
          onShowCredits={() => setShowCreditsModal(true)}
        />

        {/* Área central */}
        <div className={styles.center}>
          {/* Globo 3D */}
          <div className={styles.globeContainer}>
            <Globe3D
              hops={currentTrace?.hops || []}
              userLocation={userLocation}
              animating={isAnimating}
            />

            {/* Overlay de loading sobre o globo */}
            {isLoading && (
              <div className={styles.globeOverlay}>
                <div className={styles.loadingRing} />
                <div className={styles.loadingText}>
                  <span className={styles.loadingDot}>▶</span>
                  <span>RASTREANDO ROTA...</span>
                </div>
              </div>
            )}

            {/* Overlay de boas-vindas (sem trace) */}
            {!currentTrace && !isLoading && (
              <div className={styles.welcomeOverlay}>
                <button
                  className={styles.welcomeBtn}
                  onClick={() => setShowTraceModal(true)}
                >
                  <span className={styles.welcomeBtnIcon}>⊳</span>
                  INICIAR TRACEROUTE
                </button>
                <p className={styles.welcomeHint}>
                  Clique para rastrear uma rota de rede em tempo real
                </p>
              </div>
            )}

            {/* Label do alvo atual */}
            {currentTrace && !isLoading && (
              <div className={styles.targetLabel}>
                <span className={styles.targetLabelIcon}>◉</span>
                <span>{currentTrace.target}</span>
              </div>
            )}
          </div>

          {/* Tabela de hops */}
          <div className={styles.tableContainer}>
            <HopTable
              hops={currentTrace?.hops || []}
              loading={isLoading}
            />
          </div>
        </div>

        {/* Sidebar direita */}
        <RightSidebar
          history={history}
          onSelectTrace={handleSelectHistoryTrace}
          currentTraceId={currentTrace?.id}
        />
      </div>

      {/* ── Toast de erro ───────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorToast}>
          <span className={styles.errorIcon}>⚠</span>
          <span>{error}</span>
          <button className={styles.errorClose} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Modais ──────────────────────────────────────────────────── */}
      <TraceModal
        isOpen={showTraceModal}
        onClose={() => setShowTraceModal(false)}
        onSubmit={handleRunTrace}
        isLoading={isLoading}
      />

      <CreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </div>
  );
}
