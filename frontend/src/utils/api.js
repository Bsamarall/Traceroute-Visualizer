/**
 * api.js - Funções de comunicação com o backend
 * Centraliza todas as chamadas HTTP para facilitar manutenção
 */

import axios from 'axios';

// Base URL: usa proxy do Vite em dev, variável de ambiente em prod
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Instância configurada do axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s (traceroute pode demorar)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de resposta para tratamento padronizado de erros
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Erro de conexão com o servidor';
    
    return Promise.reject(new Error(message));
  }
);

/**
 * Executa um traceroute para o alvo especificado.
 * @param {string} target - IP ou domínio
 * @returns {Promise<Object>} Resultado com hops geolocalizados
 */
export async function runTrace(target) {
  return api.post('/trace', { target });
}

/**
 * Busca o histórico de traces.
 * @param {number} limit - Máximo de resultados
 * @returns {Promise<Object>}
 */
export async function getHistory(limit = 10) {
  return api.get(`/history?limit=${limit}`);
}

/**
 * Busca um trace específico pelo ID.
 * @param {string} id - UUID do trace
 * @returns {Promise<Object>}
 */
export async function getTrace(id) {
  return api.get(`/trace/${id}`);
}

export default api;
