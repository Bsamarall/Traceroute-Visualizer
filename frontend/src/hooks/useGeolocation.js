/**
 * useGeolocation.js - Hook para obter localização do usuário
 * Solicita permissão via navegador com fallback para IP
 */

import { useState, useEffect } from 'react';

/**
 * Obtém a geolocalização do usuário (apenas para estatísticas).
 * Nunca envia para servidor sem consentimento explícito.
 *
 * @returns {{ location: Object|null, loading: boolean, error: string|null }}
 */
export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Verifica se a API está disponível
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada pelo navegador');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Apenas coordenadas aproximadas (não armazena dados precisos)
        setLocation({
          latitude: parseFloat(position.coords.latitude.toFixed(2)),
          longitude: parseFloat(position.coords.longitude.toFixed(2)),
          accuracy: position.coords.accuracy,
          source: 'gps',
        });
        setLoading(false);
      },
      (err) => {
        // Usuário negou ou erro - usa fallback via IP (não bloqueia o app)
        setError(err.message);
        setLoading(false);
        
        // Fallback: tenta obter localização aproximada pelo IP
        fetchLocationByIP();
      },
      {
        timeout: 10000,
        maximumAge: 300000, // Cache por 5 minutos
        enableHighAccuracy: false, // Não precisa de alta precisão
      }
    );
  }, []);

  /**
   * Fallback: obtém localização pelo IP público.
   * Usa ip-api.com (sem chave, gratuito).
   */
  async function fetchLocationByIP() {
    try {
      const response = await fetch('http://ip-api.com/json?fields=lat,lon,city,country');
      const data = await response.json();
      
      if (data.lat && data.lon) {
        setLocation({
          latitude: data.lat,
          longitude: data.lon,
          city: data.city,
          country: data.country,
          source: 'ip',
        });
      }
    } catch {
      // Silenciosamente falha - geolocalização é opcional
    }
  }

  return { location, loading, error };
}
