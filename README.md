# 🌐 Traceroute Visualizer

> Visualize rotas de rede em um globo 3D interativo com geolocalização em tempo real.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.x-61DAFB)
![Status](https://img.shields.io/badge/status-estável-success)

---

## 📋 Descrição

**Traceroute Visualizer** é uma aplicação web fullstack de diagnóstico de rede que executa traceroutes em IPs ou domínios, geolocaliza cada salto (hop) da rota e exibe os resultados em um globo 3D interativo com linhas neon e animação progressiva.

### O que faz:
- Executa `traceroute` no servidor de forma segura (sem injeção de comandos)
- Geolocaliza cada hop via API gratuita (`ip-api.com`) com cache em dois níveis
- Exibe a rota animada em um globo 3D com arcos coloridos por latência
- Lista detalhes de cada hop: IP, cidade, país, bandeira, RTT em ms
- Mantém histórico persistente das buscas em SQLite
- Detecta e destaca automaticamente hops com alta latência (>150ms)
- Suporta geolocalização do usuário para exibir ponto de origem

---

## ⚠️ Aviso Legal

> Esta ferramenta foi desenvolvida **exclusivamente para fins educacionais e de diagnóstico de redes próprias**. O `traceroute` é uma técnica legítima de análise de tráfego IP, utilizada por administradores de rede e profissionais de segurança.
>
> **Não utilize** esta ferramenta em redes ou sistemas sem autorização explícita dos proprietários.
> O autor **não se responsabiliza** pelo uso indevido desta aplicação.
>
> Em algumas jurisdições, a análise de tráfego de rede sem autorização pode constituir crime.

---

## 🚀 Como Instalar

### Pré-requisitos

| Requisito | Versão mínima | Como verificar |
|-----------|--------------|----------------|
| Node.js   | 18.x         | `node --version` |
| npm       | 9.x          | `npm --version` |
| traceroute | qualquer    | `traceroute --version` |

#### Instalar o `traceroute` (se necessário):

```bash
# Ubuntu / Debian
sudo apt-get install traceroute

# macOS (geralmente já incluso)
brew install traceroute

# Windows: usa tracert nativo (sem instalação)
```

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/traceroute-visualizer.git
cd traceroute-visualizer
```

### 2. Configure o Backend

```bash
cd backend

# Instala dependências
npm install

# Copia e edita as variáveis de ambiente
cp .env.example .env
# Edite o .env conforme necessário (porta, rate limit, etc.)
ls -la (na pasta backend para ver .env)
```

### 3. Configure o Frontend

```bash
cd ../frontend

# Instala dependências
npm install
```

---

## ▶️ Como Rodar

### Desenvolvimento (dois terminais)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Servidor em http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Interface em http://localhost:5173
```

Acesse: **http://localhost:5173**

### Produção

```bash
# 1. Build do frontend
cd frontend && npm run build

# 2. Sirva o frontend com nginx ou similar
# (ou copie dist/ para public/ do backend)

# 3. Inicie o backend
cd ../backend && npm start
```

---

## 📖 Como Usar

1. **Abra** o aplicativo em `http://localhost:5173`
2. **Clique** em "Nova Rota" na barra lateral esquerda
3. **Digite** um IP (ex: `8.8.8.8`) ou domínio (ex: `google.com`)
   - Ou use os atalhos rápidos: Google DNS, Cloudflare, etc.
4. **Clique** em "Iniciar Traceroute"
5. **Observe** a rota sendo desenhada hop-a-hop no globo 3D
6. **Analise** os detalhes na tabela abaixo: IP, cidade, latência
7. **Verifique** as cores dos arcos:
   - 🟢 Verde: latência boa (< 50ms)
   - 🟡 Amarelo: latência média (50–150ms)
   - 🟠 Laranja: latência alta (150–300ms)
   - 🔴 Vermelho: latência crítica (> 300ms)
   - ⚫ Cinza: timeout (sem resposta)
8. **Acesse** o histórico na barra lateral direita para rever traços anteriores

---

## 📁 Estrutura do Projeto

```
traceroute-visualizer/
│
├── backend/
│   ├── src/
│   │   ├── index.js                  # Entrada do servidor Express
│   │   ├── routes/
│   │   │   └── trace.routes.js       # Endpoints: /trace, /history
│   │   ├── services/
│   │   │   ├── traceroute.service.js # Execução segura do traceroute
│   │   │   └── geo.service.js        # Geolocalização com cache duplo
│   │   ├── middleware/
│   │   │   └── security.middleware.js # Rate limit, logging, CORS
│   │   ├── db/
│   │   │   └── database.js           # SQLite via better-sqlite3
│   │   └── utils/
│   │       ├── validator.js          # Validação anti-injection
│   │       └── logger.js             # Winston logs estruturados
│   ├── data/                         # Banco SQLite (gerado automaticamente)
│   ├── logs/                         # Logs da aplicação
│   ├── .env.example                  # Template de variáveis de ambiente
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                  # Entrada React
│   │   ├── App.jsx                   # Componente principal + estado global
│   │   ├── App.module.css            # Layout principal
│   │   ├── components/
│   │   │   ├── Globe3D.jsx           # Globo 3D com globe.gl + Three.js
│   │   │   ├── HopTable.jsx          # Tabela detalhada dos hops
│   │   │   ├── HopTable.module.css
│   │   │   ├── Sidebar.jsx           # Sidebars esquerda e direita
│   │   │   ├── Sidebar.module.css
│   │   │   ├── StatsBar.jsx          # Barra de estatísticas do trace
│   │   │   ├── StatsBar.module.css
│   │   │   ├── TraceModal.jsx        # Modal de entrada do alvo
│   │   │   ├── TraceModal.module.css
│   │   │   ├── CreditsModal.jsx      # Modal de créditos
│   │   │   └── CreditsModal.module.css
│   │   ├── hooks/
│   │   │   └── useGeolocation.js     # Hook de geolocalização do usuário
│   │   ├── utils/
│   │   │   ├── api.js                # Axios configurado para o backend
│   │   │   └── latency.js            # Classificação de latência e cores
│   │   └── styles/
│   │       └── globals.css           # Variáveis CSS, reset, utilitários
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── docs/
    └── architecture.md               # Diagrama de arquitetura
```

---

## 🔐 Segurança

Esta aplicação foi desenvolvida com segurança como prioridade:

| Medida | Implementação |
|--------|--------------|
| **Command Injection** | Validação rigorosa por regex; `spawn` sem `shell:true` |
| **Rate Limiting** | 5 req/min por IP para `/trace`; 60 req/min geral |
| **Input Sanitization** | Validação de IPv4, IPv6 e domínio (RFC 1123) |
| **Headers HTTP** | Helmet.js com Content-Security-Policy |
| **CORS** | Whitelist de origens configurável |
| **Body Size** | Limite de 10KB para evitar DoS por payload |
| **Logs Seguros** | IPs de usuários não logados em produção |
| **Timeout** | Traceroute com timeout de 30s para evitar processos zumbis |

---

## 🛠️ Tecnologias Utilizadas

### Backend
| Tecnologia | Uso |
|-----------|-----|
| **Node.js 18+** | Runtime JavaScript |
| **Express 4** | Framework HTTP |
| **better-sqlite3** | Banco de dados local (síncrono, rápido) |
| **Helmet** | Headers HTTP seguros |
| **express-rate-limit** | Rate limiting por IP |
| **Winston** | Logging estruturado |
| **node-cache** | Cache em memória para geolocalização |
| **axios** | Cliente HTTP para a API de geo |
| **dotenv** | Variáveis de ambiente |

### Frontend
| Tecnologia | Uso |
|-----------|-----|
| **React 18** | Interface do usuário |
| **Vite 4** | Build tool e dev server |
| **globe.gl** | Globo 3D (wrapper Three.js) |
| **Three.js** | Engine 3D subjacente |
| **CSS Modules** | Estilos escopados por componente |

### APIs Externas
| API | Uso | Limite gratuito |
|-----|-----|----------------|
| **ip-api.com** | Geolocalização de IPs | 45 req/min |
| **Navigator.geolocation** | Localização do usuário (browser) | Ilimitado |
| **flagcdn.com** | Bandeiras dos países | Ilimitado |

---

## 👥 Créditos

> "Esse projeto foi bem difícil, precisei da ajuda de uma IA haha, porém isso não diminui meu esforço. Espero que esteja gostando da ferramenta e sinta-se à vontade para enviar um feedback."

---

## 📄 Licença

MIT License — use, modifique e distribua livremente, desde que mantenha os créditos.

---

*Feito com ☕ e muito `traceroute` — diagnóstico de redes nunca foi tão bonito.*
