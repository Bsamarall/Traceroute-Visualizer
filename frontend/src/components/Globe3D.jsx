/**
 * ============================================================
 * Globe3D.jsx - Globo interativo com rotas de traceroute
 * ============================================================
 * Usa globe.gl (baseado em Three.js) para renderizar um globo
 * 3D com pontos e arcos animados representando cada hop.
 *
 * Recursos:
 * - Textura da Terra com tema dark/cyberpunk
 * - Arcos animados entre hops (coloridos por latência)
 * - Pontos pulsantes em cada hop
 * - Animação progressiva hop-por-hop
 * - Auto-rotação e interação por drag
 */

import { useEffect, useRef, useCallback } from 'react';
import { getLatencyColor } from '../utils/latency';

// ─── Constantes de Estilo ─────────────────────────────────────────────────────

const GLOBE_CONFIG = {
  backgroundColor: 'rgba(0,0,0,0)',           // Transparente (bg do CSS)
  atmosphereColor: '#00f5ff',                  // Ciano neon
  atmosphereAltitude: 0.12,
  showAtmosphere: true,
  globeImageUrl:
    // Imagem de satélite escura - tema cyberpunk
    'https://unpkg.com/three-globe/example/img/earth-night.jpg',
  bumpImageUrl:
    'https://unpkg.com/three-globe/example/img/earth-topology.png',
};

/**
 * Filtra hops com coordenadas geográficas válidas.
 * @param {Array} hops
 * @returns {Array}
 */
function getValidHops(hops) {
  return hops.filter(
    (h) =>
      h.latitude !== null &&
      h.longitude !== null &&
      h.latitude !== 0 &&
      h.longitude !== 0 &&
      !h.is_private
  );
}

/**
 * Gera os arcos (linhas) entre hops consecutivos para o globo.
 * @param {Array} validHops - Hops com coordenadas válidas
 * @returns {Array} Arcos no formato esperado pelo globe.gl
 */
function buildArcs(validHops) {
  const arcs = [];
  for (let i = 0; i < validHops.length - 1; i++) {
    const from = validHops[i];
    const to = validHops[i + 1];
    arcs.push({
      startLat: from.latitude,
      startLng: from.longitude,
      endLat: to.latitude,
      endLng: to.longitude,
      color: getLatencyColor(to.rtt_ms),
      label: `${from.city} → ${to.city}`,
      // Altitude do arco proporcional à distância
      altitude: 0.3,
    });
  }
  return arcs;
}

/**
 * Gera os pontos (marcadores) em cada hop.
 * @param {Array} validHops
 * @returns {Array}
 */
function buildPoints(validHops) {
  return validHops.map((hop, idx) => ({
    lat: hop.latitude,
    lng: hop.longitude,
    size: idx === 0 || idx === validHops.length - 1 ? 0.8 : 0.5,
    color: getLatencyColor(hop.rtt_ms),
    label: `#${hop.hop_number} ${hop.ip}\n${hop.city}, ${hop.country}`,
    hop,
  }));
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Globe3D({ hops = [], userLocation = null, animating = false }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const GlobeModule = useRef(null);

  /**
   * Inicializa o globo.gl.
   * Carregado dinamicamente para evitar SSR issues.
   */
  const initGlobe = useCallback(async () => {
    if (!containerRef.current || globeRef.current) return;

    // Importação dinâmica do globe.gl
    const GlobeGL = (await import('globe.gl')).default;
    GlobeModule.current = GlobeGL;

    const { width, height } = containerRef.current.getBoundingClientRect();

    const globe = GlobeGL()(containerRef.current)
      // Configurações visuais
      .backgroundColor(GLOBE_CONFIG.backgroundColor)
      .showAtmosphere(GLOBE_CONFIG.showAtmosphere)
      .atmosphereColor(GLOBE_CONFIG.atmosphereColor)
      .atmosphereAltitude(GLOBE_CONFIG.atmosphereAltitude)
      .globeImageUrl(GLOBE_CONFIG.globeImageUrl)
      .bumpImageUrl(GLOBE_CONFIG.bumpImageUrl)
      // Tamanho inicial
      .width(width)
      .height(height);

    // Configura arcos (rotas entre hops)
    globe
      .arcColor('color')
      .arcAltitude('altitude')
      .arcStroke(0.5)
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2000)    // Velocidade da animação do arco
      .arcLabel('label');

    // Configura pontos (marcadores nos hops)
    globe
      .pointColor('color')
      .pointAltitude(0.01)
      .pointRadius('size')
      .pointLabel('label')
      .pointsMerge(false);

    // Localização do usuário como ponto de origem especial
    if (userLocation?.latitude && userLocation?.longitude) {
      globe.ringsData([{
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        maxR: 3,
        propagationSpeed: 3,
        repeatPeriod: 700,
        color: () => '#00f5ff',
      }])
      .ringColor('color')
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod');
    }

    // Auto-rotação suave
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.3;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.1;

    globeRef.current = globe;

    // Centraliza visão inicial na América do Sul
    globe.pointOfView({ lat: -15, lng: -47, altitude: 2.5 }, 1000);

    return globe;
  }, [userLocation]);

  // Inicializa o globo na montagem do componente
  useEffect(() => {
    initGlobe();

    // Resize handler
    const handleResize = () => {
      if (globeRef.current && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        globeRef.current.width(width).height(height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // Cleanup do globo
      if (globeRef.current) {
        try {
          globeRef.current._destructor?.();
        } catch (_) {}
        globeRef.current = null;
      }
    };
  }, [initGlobe]);

  /**
   * Atualiza dados do globo quando os hops mudam.
   * Anima progressivamente se `animating` for true.
   */
  useEffect(() => {
    if (!globeRef.current) return;

    const validHops = getValidHops(hops);

    if (validHops.length === 0) {
      // Limpa o globo se não há hops
      globeRef.current.arcsData([]).pointsData([]);
      return;
    }

    if (animating) {
      // Animação progressiva: adiciona um hop por vez
      let currentIndex = 0;

      const addNextHop = () => {
        if (currentIndex >= validHops.length) return;
        currentIndex++;

        const visibleHops = validHops.slice(0, currentIndex);
        globeRef.current
          .arcsData(buildArcs(visibleHops))
          .pointsData(buildPoints(visibleHops));

        // Aponta o globo para o hop atual
        const lastHop = visibleHops[visibleHops.length - 1];
        globeRef.current.pointOfView(
          { lat: lastHop.latitude, lng: lastHop.longitude, altitude: 2 },
          800
        );

        // Agenda próximo hop
        if (currentIndex < validHops.length) {
          setTimeout(addNextHop, 600);
        }
      };

      // Pequeno delay inicial para efeito dramático
      setTimeout(addNextHop, 300);
    } else {
      // Mostra todos de uma vez (para histórico, por exemplo)
      globeRef.current
        .arcsData(buildArcs(validHops))
        .pointsData(buildPoints(validHops));

      // Centraliza na rota completa
      if (validHops.length > 0) {
        const midHop = validHops[Math.floor(validHops.length / 2)];
        globeRef.current.pointOfView(
          { lat: midHop.latitude, lng: midHop.longitude, altitude: 2.2 },
          1200
        );
      }
    }
  }, [hops, animating]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: 'grab',
        // Posicionamento relativo para overlay de loading
        position: 'relative',
      }}
    />
  );
}
