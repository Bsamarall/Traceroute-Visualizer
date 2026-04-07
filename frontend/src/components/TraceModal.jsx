/**
 * ============================================================
 * TraceModal.jsx - Modal para inserir alvo do traceroute
 * ============================================================
 * Features:
 * - Validação client-side de IP/domínio
 * - Feedback visual de erro
 * - Sugestões rápidas de alvos comuns
 * - Animação de entrada/saída
 */

import { useState, useEffect, useRef } from 'react';
import styles from './TraceModal.module.css';

// ─── Sugestões rápidas ────────────────────────────────────────────────────────

const QUICK_TARGETS = [
  { label: 'Google DNS', value: '8.8.8.8' },
  { label: 'Cloudflare', value: '1.1.1.1' },
  { label: 'Google.com', value: 'google.com' },
  { label: 'GitHub', value: 'github.com' },
  { label: 'OpenAI', value: 'openai.com' },
];

// ─── Regex de validação client-side (espelho do backend) ─────────────────────

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const DOMAIN_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

function isValidTarget(val) {
  const t = val.trim();
  if (!t) return false;
  if (IPV4_RE.test(t)) {
    const octets = t.split('.').map(Number);
    return octets.every(o => o >= 0 && o <= 255);
  }
  return DOMAIN_RE.test(t);
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TraceModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Foca no input quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setTarget('');
      setError('');
    }
  }, [isOpen]);

  // Fecha com Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    const trimmed = target.trim();
    if (!trimmed) {
      setError('Digite um IP ou domínio');
      return;
    }
    if (!isValidTarget(trimmed)) {
      setError('Formato inválido. Ex: 8.8.8.8 ou google.com');
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  const handleQuickSelect = (value) => {
    setTarget(value);
    setError('');
  };

  const handleChange = (e) => {
    setTarget(e.target.value);
    if (error) setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Decoração de cantos */}
        <div className={styles.cornerTL} />
        <div className={styles.cornerTR} />
        <div className={styles.cornerBL} />
        <div className={styles.cornerBR} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>◉</div>
          <div>
            <h2 className={styles.title}>NOVA ROTA</h2>
            <p className={styles.subtitle}>Traceroute + Geolocalização</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} disabled={isLoading}>✕</button>
        </div>

        {/* Input */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>DESTINO</label>
          <div className={`${styles.inputWrapper} ${error ? styles.inputError : ''}`}>
            <span className={styles.inputPrefix}>→</span>
            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              value={target}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Ex: google.com ou 8.8.8.8"
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {error && <span className={styles.errorMsg}>{error}</span>}
        </div>

        {/* Sugestões rápidas */}
        <div className={styles.quickSection}>
          <span className={styles.quickLabel}>ACESSO RÁPIDO</span>
          <div className={styles.quickGrid}>
            {QUICK_TARGETS.map((t) => (
              <button
                key={t.value}
                className={`${styles.quickBtn} ${target === t.value ? styles.quickBtnActive : ''}`}
                onClick={() => handleQuickSelect(t.value)}
                disabled={isLoading}
              >
                <span className={styles.quickBtnLabel}>{t.label}</span>
                <span className={styles.quickBtnValue}>{t.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botão de ação */}
        <button
          className={`${styles.submitBtn} ${isLoading ? styles.submitBtnLoading : ''}`}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className={styles.spinner} />
              <span>EXECUTANDO TRACEROUTE...</span>
            </>
          ) : (
            <>
              <span className={styles.submitIcon}>⊳</span>
              <span>INICIAR TRACEROUTE</span>
            </>
          )}
        </button>

        {/* Aviso de segurança */}
        <p className={styles.notice}>
          ⚠ Apenas para fins educacionais e de diagnóstico de rede
        </p>
      </div>
    </div>
  );
}
