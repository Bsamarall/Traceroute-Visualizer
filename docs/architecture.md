# Arquitetura do Traceroute Visualizer

## Fluxo de uma Requisição

```
Usuário digita "google.com"
         │
         ▼
 [TraceModal] valida client-side
         │
         ▼
 POST /api/trace { target: "google.com" }
         │
         ▼
 [security.middleware]
   ├─ Rate limit ok?
   ├─ Content-Type ok?
   └─ Continua...
         │
         ▼
 [trace.routes.js]
   └─ validateTarget() ← [validator.js]
         │
         ▼
 [traceroute.service.js]
   └─ spawn('traceroute', ['-n','-m','30','-w','3','-q','1','google.com'])
      sem shell:true — seguro contra injection
         │
         ▼
 Parse da saída linha por linha
   "  1  192.168.1.1  1.234 ms"
   "  2  10.0.0.1  5.6 ms"
   ...
         │
         ▼
 [geo.service.js] para cada IP único
   ├─ Cache memória? → retorna
   ├─ Cache SQLite?  → retorna
   └─ GET ip-api.com/json/{ip} → salva cache
         │
         ▼
 Merge: hop + geodata
         │
         ▼
 Salva no SQLite (traces + hops)
         │
         ▼
 Retorna JSON ao frontend
         │
         ▼
 [Globe3D] anima progressivamente
 [HopTable] exibe linhas com delay
```

## Banco de Dados (SQLite)

```
traces
├── id (UUID)
├── target
├── created_at
├── status (pending|completed|failed)
├── total_hops
└── duration_ms

hops
├── id
├── trace_id (FK → traces)
├── hop_number
├── ip
├── city, country, country_code
├── latitude, longitude
├── rtt_ms
├── is_private
└── is_timeout

geo_cache
├── ip (PK)
├── city, country, country_code
├── latitude, longitude
└── cached_at
```

## Cache de Geolocalização (2 camadas)

```
Requisição de geo para IP X
         │
         ├── [NodeCache] hit? ──→ retorna (< 1ms)
         │
         ├── [SQLite] hit? ────→ retorna + popula NodeCache (< 5ms)
         │
         └── [ip-api.com] ────→ retorna + salva ambos os caches (100-500ms)
```

TTL padrão: 1 hora (configurável via GEO_CACHE_TTL)
