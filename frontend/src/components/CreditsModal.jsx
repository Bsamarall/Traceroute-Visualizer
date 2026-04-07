/**
 * CreditsModal.jsx - Modal de créditos do projeto
 */

import styles from './CreditsModal.module.css';

export default function CreditsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.cornerTL} /><div className={styles.cornerTR} />
        <div className={styles.cornerBL} /><div className={styles.cornerBR} />

        <div className={styles.header}>
          <span className={styles.icon}>◈</span>
          <h2 className={styles.title}>CRÉDITOS</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {/* Mensagem pessoal */}
          <div className={styles.personalNote}>
            <div className={styles.noteIcon}>💬</div>
            <p className={styles.noteText}>
              "Esse projeto foi bem difícil, precisei da ajuda de uma IA haha, porém isso não diminui
              meu esforço. Espero que esteja gostando da ferramenta e sinta-se à vontade para
              enviar um feedback."
            </p>
          </div>

          <div className={styles.divider} />

          {/* Tecnologias */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>TECNOLOGIAS</span>
            <div className={styles.techGrid}>
              {[
                { name: 'Node.js', desc: 'Runtime backend' },
                { name: 'Express', desc: 'Framework HTTP' },
                { name: 'SQLite', desc: 'Banco de dados local' },
                { name: 'React 18', desc: 'Interface do usuário' },
                { name: 'Vite', desc: 'Build tool' },
                { name: 'globe.gl', desc: 'Globo 3D (Three.js)' },
                { name: 'ip-api.com', desc: 'Geolocalização gratuita' },
                { name: 'Winston', desc: 'Sistema de logs' },
              ].map((tech) => (
                <div key={tech.name} className={styles.techItem}>
                  <span className={styles.techName}>{tech.name}</span>
                  <span className={styles.techDesc}>{tech.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Aviso Legal */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>AVISO LEGAL</span>
            <p className={styles.legalText}>
              Esta ferramenta foi desenvolvida exclusivamente para fins educacionais e de
              diagnóstico de redes. O traceroute é uma técnica legítima de análise de
              tráfego. Não utilize para fins maliciosos ou sem autorização dos sistemas alvo.
              O autor não se responsabiliza pelo uso indevido.
            </p>
          </div>

          <div className={styles.divider} />

          <div className={styles.footer}>
            <span className={styles.footerText}>Traceroute Visualizer</span>
            <span className={styles.footerVersion}>v1.0.0 · 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
}
