# Mo'WhatsApp — Régie Publicitaire Stories WhatsApp
## Claude Code Project Skill

---

## IDENTITÉ DU PROJET

- **Nom** : Mo'WhatsApp
- **Type** : Plateforme de régie publicitaire WhatsApp Stories
- **Stack** : Next.js 14 (App Router) + PostgreSQL + Prisma + WAHA GOWS API + IPRoyal API
- **Déploiement** : Coolify (Docker) sur VPS aseta.fr
- **Domaine app** : mowhatsapp.aseta.fr (à configurer)
- **WAHA existant** : waha.aseta.fr (déjà déployé, engine GOWS, PostgreSQL persistant)

---

## CONCEPT MÉTIER

Mo'WhatsApp est une régie publicitaire qui automatise la publication de Stories WhatsApp pour des marques clientes. Le système gère :

1. **Marques** (ex: JungleTech) — les annonceurs qui payent pour diffuser du contenu
2. **Campagnes** — associées à une marque, avec une fréquence de boucle (1 à 7 jours) et du contenu (images/vidéos/textes)
3. **WhatsAppeurs** — des personnes qui connectent leur WhatsApp pour diffuser les Stories des marques (rémunérés par la régie)
4. **Sessions WAHA** — chaque WhatsAppeur = une session WAHA avec metadata.brands[] pour le ciblage
5. **Proxies IPRoyal** — distribués automatiquement aux sessions (max 2 sessions par proxy) pour éviter les bans

Le **scheduler interne** (CRON Node.js) tourne chaque jour et pour chaque campagne active :
- Vérifie si c'est un jour de publication selon la fréquence de boucle
- Sélectionne le contenu suivant dans la rotation
- Trouve toutes les sessions tagées pour cette marque
- Publie la Story via l'API WAHA

---

## VARIABLES D'ENVIRONNEMENT

```env
# === WAHA ===
WAHA_API_URL=https://waha.aseta.fr
WAHA_API_KEY=xxx
WAHA_DASHBOARD_USER=admin
WAHA_DASHBOARD_PASS=xxx

# === IPROYAL ===
API_IPROYAL=xxx

# === DATABASE ===
DATABASE_URL=postgres://mowhatsapp:xxx@localhost:5432/mowhatsapp

# === APP ===
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://mowhatsapp.aseta.fr
UPLOAD_DIR=/app/uploads
CRON_SECRET=xxx
```

**IMPORTANT** : Ne JAMAIS hardcoder ces valeurs. Toujours utiliser `process.env.VARIABLE`.

---

## ARCHITECTURE TECHNIQUE

```
mowhatsapp/
├── prisma/
│   └── schema.prisma              # Schéma DB complet
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Layout global (sidebar admin)
│   │   ├── page.tsx               # Dashboard principal
│   │   ├── brands/
│   │   │   ├── page.tsx           # Liste des marques
│   │   │   └── [id]/page.tsx      # Détail marque + campagnes
│   │   ├── campaigns/
│   │   │   ├── page.tsx           # Liste campagnes
│   │   │   └── [id]/page.tsx      # Détail campagne + upload contenu
│   │   ├── sessions/
│   │   │   └── page.tsx           # Liste sessions WAHA + statuts
│   │   ├── proxies/
│   │   │   └── page.tsx           # Gestion proxies IPRoyal
│   │   ├── join/
│   │   │   └── page.tsx           # Formulaire WhatsAppeur (PUBLIC)
│   │   └── api/
│   │       ├── brands/route.ts
│   │       ├── campaigns/route.ts
│   │       ├── content/
│   │       │   ├── route.ts       # CRUD + upload fichiers
│   │       │   └── upload/route.ts
│   │       ├── sessions/
│   │       │   ├── route.ts       # CRUD sessions
│   │       │   └── [name]/
│   │       │       ├── qr/route.ts
│   │       │       └── status/route.ts
│   │       ├── proxies/
│   │       │   ├── route.ts       # Gestion pool proxy
│   │       │   └── assign/route.ts
│   │       ├── scheduler/
│   │       │   └── run/route.ts   # Endpoint CRON
│   │       └── webhooks/
│   │           └── waha/route.ts  # Réception webhooks WAHA
│   ├── lib/
│   │   ├── prisma.ts              # Client Prisma singleton
│   │   ├── waha.ts                # Client API WAHA
│   │   ├── iproyal.ts             # Client API IPRoyal
│   │   ├── scheduler.ts           # Logique de boucles + publication
│   │   └── proxy-manager.ts       # Distribution auto des proxies
│   └── components/
│       ├── ui/                    # Composants shadcn/ui
│       ├── BrandCard.tsx
│       ├── CampaignEditor.tsx
│       ├── ContentUploader.tsx    # Drag & drop zone
│       ├── SessionList.tsx
│       ├── ProxyPool.tsx
│       └── QRScanner.tsx          # Affichage QR pour WhatsAppeurs
├── public/
│   └── uploads/                   # Médias uploadés (servir en static)
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

---

## SCHÉMA PRISMA

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Brand {
  id          String     @id @default(cuid())
  name        String     @unique
  slug        String     @unique
  logoUrl     String?
  ctaUrl      String?    // Lien vers le site/commande
  ctaType     CtaType    @default(LINK)
  ctaPhone    String?    // Numéro WhatsApp pour CTA WhatsApp
  active      Boolean    @default(true)
  campaigns   Campaign[]
  sessions    SessionBrand[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Campaign {
  id           String    @id @default(cuid())
  brandId      String
  brand        Brand     @relation(fields: [brandId], references: [id], onDelete: Cascade)
  name         String
  loopDays     Int       // 1 à 7
  publishTime  String    @default("09:00") // Heure de publication HH:mm
  status       CampaignStatus @default(ACTIVE)
  startDate    DateTime  @default(now())
  contents     Content[]
  publishLogs  PublishLog[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Content {
  id           String      @id @default(cuid())
  campaignId   String
  campaign     Campaign    @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  type         ContentType
  fileUrl      String      // URL relative dans /uploads
  fileName     String
  mimeType     String
  caption      String?     // Texte accompagnant le média
  position     Int         // Ordre dans la boucle (0-indexed)
  publishLogs  PublishLog[]
  createdAt    DateTime    @default(now())
}

model WahaSession {
  id            String         @id @default(cuid())
  sessionName   String         @unique // Nom dans WAHA (ex: wa-jean-0594)
  phoneNumber   String?
  displayName   String?
  status        SessionStatus  @default(PENDING)
  proxyId       String?
  proxy         Proxy?         @relation(fields: [proxyId], references: [id])
  brands        SessionBrand[]
  publishLogs   PublishLog[]
  lastSeenAt    DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model SessionBrand {
  sessionId  String
  session    WahaSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  brandId    String
  brand      Brand       @relation(fields: [brandId], references: [id], onDelete: Cascade)
  assignedAt DateTime    @default(now())

  @@id([sessionId, brandId])
}

model Proxy {
  id           String        @id @default(cuid())
  server       String        // host:port
  username     String
  password     String
  country      String        @default("FR")
  maxSessions  Int           @default(2)
  sessions     WahaSession[]
  active       Boolean       @default(true)
  createdAt    DateTime      @default(now())
}

model PublishLog {
  id          String       @id @default(cuid())
  campaignId  String
  campaign    Campaign     @relation(fields: [campaignId], references: [id])
  contentId   String
  content     Content      @relation(fields: [contentId], references: [id])
  sessionId   String
  session     WahaSession  @relation(fields: [sessionId], references: [id])
  status      PublishStatus @default(PENDING)
  error       String?
  publishedAt DateTime     @default(now())
}

enum CtaType {
  LINK
  WHATSAPP
}

enum CampaignStatus {
  ACTIVE
  PAUSED
  COMPLETED
}

enum ContentType {
  IMAGE
  VIDEO
  TEXT
}

enum SessionStatus {
  PENDING       // Créée, pas encore connectée
  SCAN_QR       // En attente de scan QR
  WORKING       // Connectée et opérationnelle
  FAILED        // Erreur
  STOPPED       // Arrêtée manuellement
}

enum PublishStatus {
  PENDING
  SENT
  FAILED
}
```

---

## RÉFÉRENCE API WAHA (Endpoints critiques)

Base URL : `process.env.WAHA_API_URL`
Auth : Header `X-Api-Key: process.env.WAHA_API_KEY`

### Créer une session avec proxy et metadata
```
POST /api/sessions
{
  "name": "wa-jean-0594",
  "start": true,
  "config": {
    "metadata": {
      "brands": "jungletech,taboo",
      "phone": "0594123456",
      "managedBy": "mowhatsapp"
    },
    "proxy": {
      "server": "geo.iproyal.com:12321",
      "username": "user_country-gf_session-wa-jean-0594",
      "password": "password123"
    },
    "webhooks": [{
      "url": "https://mowhatsapp.aseta.fr/api/webhooks/waha",
      "events": ["session.status"]
    }]
  }
}
```

### Récupérer le QR code
```
GET /api/{session}/auth/qr
Headers: Accept: image/png
→ Retourne l'image PNG du QR code

GET /api/{session}/auth/qr?format=raw
→ Retourne le string QR pour génération côté client
```

### Lister toutes les sessions
```
GET /api/sessions?all=true
→ Retourne un tableau de sessions avec status, config, metadata
```

### Obtenir le statut d'une session
```
GET /api/sessions/{session}
→ { "name": "...", "status": "WORKING", "config": {...}, "me": {...} }
```

### Mettre à jour une session (metadata, proxy)
```
PUT /api/sessions/{session}
{
  "config": {
    "metadata": { "brands": "jungletech,taboo,newbrand" }
  }
}
```

### Publier un Status texte
```
POST /api/{session}/status/text
{
  "text": "Découvrez JungleTech ! 🔥 https://jungletech.gf",
  "backgroundColor": "#1a1a2e",
  "font": 2,
  "contacts": ["594694001234@c.us"]  // Optionnel, GOWS supporte
}
```

### Publier un Status image
```
POST /api/{session}/status/image
{
  "file": {
    "mimetype": "image/jpeg",
    "url": "https://mowhatsapp.aseta.fr/uploads/campaign-123/slide-01.jpg"
  },
  "caption": "Commandez sur jungletech.gf !"
}
```

### Publier un Status vidéo
```
POST /api/{session}/status/video
{
  "file": {
    "mimetype": "video/mp4",
    "url": "https://mowhatsapp.aseta.fr/uploads/campaign-123/promo.mp4"
  },
  "convert": true
}
```
⚠️ `convert: true` est recommandé — WAHA convertit automatiquement en MP4 libx264.

### Supprimer un Status
```
POST /api/{session}/status/delete
{ "id": "status_message_id" }
```

---

## RÉFÉRENCE API IPROYAL

Base URL : `https://resi-api.iproyal.com/v1`
Auth : Header `Authorization: Bearer process.env.API_IPROYAL`

### Récupérer les entry nodes
```
GET /access/entry-nodes
→ Retourne les serveurs proxy disponibles avec DNS et ports
```

### Générer une liste de proxies
```
POST /access/generate-proxy-list
{
  "format": "{hostname}:{port}:{username}:{password}",
  "hostname": "geo.iproyal.com",
  "port": "http|https",
  "rotation": "sticky",
  "location": "_country-gf",
  "proxy_count": 10
}
→ Retourne des strings host:port:user:pass prêtes à l'emploi
```

### Format proxy string pour WAHA
Le proxy WAHA attend le format : `server: "host:port"`, `username: "..."`, `password: "..."`
Depuis IPRoyal, la string `geo.iproyal.com:12321:username:password` se décompose en :
- `server`: `geo.iproyal.com:12321`
- `username`: le username IPRoyal (inclut le ciblage pays dans le password)
- `password`: le password IPRoyal

Pour sticky sessions (même IP stable) : ajouter `_session-{session_name}` au username.
Pour cibler la Guyane française : `_country-gf` dans le username/password.

---

## LOGIQUE DU SCHEDULER

Fichier : `src/lib/scheduler.ts`

```typescript
// PSEUDO-CODE — À implémenter
async function runScheduler() {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'ACTIVE' },
    include: { brand: true, contents: { orderBy: { position: 'asc' } } }
  });

  for (const campaign of campaigns) {
    // 1. Calculer si c'est un jour de publication
    const daysSinceStart = differenceInDays(now, campaign.startDate);
    if (daysSinceStart % campaign.loopDays !== 0) continue;

    // 2. Calculer quel contenu publier (rotation circulaire)
    const cycleIndex = Math.floor(daysSinceStart / campaign.loopDays);
    const contentIndex = cycleIndex % campaign.contents.length;
    const content = campaign.contents[contentIndex];
    if (!content) continue;

    // 3. Trouver toutes les sessions tagées pour cette marque
    const sessions = await prisma.wahaSession.findMany({
      where: {
        status: 'WORKING',
        brands: { some: { brandId: campaign.brandId } }
      }
    });

    // 4. Publier sur chaque session
    for (const session of sessions) {
      try {
        await publishStatus(session.sessionName, content, campaign);
        await prisma.publishLog.create({
          data: {
            campaignId: campaign.id,
            contentId: content.id,
            sessionId: session.id,
            status: 'SENT'
          }
        });
      } catch (error) {
        await prisma.publishLog.create({
          data: {
            campaignId: campaign.id,
            contentId: content.id,
            sessionId: session.id,
            status: 'FAILED',
            error: error.message
          }
        });
      }
    }
  }
}
```

---

## LOGIQUE PROXY MANAGER

Fichier : `src/lib/proxy-manager.ts`

```typescript
// PSEUDO-CODE — À implémenter
async function assignProxyToSession(sessionName: string): Promise<Proxy> {
  // 1. Chercher un proxy avec de la capacité (< maxSessions utilisées)
  let proxy = await prisma.proxy.findFirst({
    where: {
      active: true,
      sessions: { _count: { lt: 2 } }  // Max 2 sessions par proxy
    },
    include: { _count: { select: { sessions: true } } }
  });

  // 2. Si aucun proxy dispo, en générer via IPRoyal
  if (!proxy) {
    const newProxies = await ipRoyalClient.generateProxyList({
      count: 5,
      country: 'gf',
      rotation: 'sticky'
    });
    // Sauvegarder en DB et prendre le premier
    proxy = await prisma.proxy.create({ data: newProxies[0] });
  }

  return proxy;
}
```

---

## FLUX WHATSAPPEUR (Page publique /join)

1. L'utilisateur accède à `/join`
2. Il entre son numéro de téléphone
3. Il sélectionne les marques pour lesquelles il veut faire de la pub (checkboxes)
4. Le backend :
   a. Assigne un proxy via le proxy-manager
   b. Crée la session WAHA avec `POST /api/sessions` (metadata.brands, proxy config)
   c. Retourne le QR code via `GET /api/{session}/auth/qr`
5. L'utilisateur scanne le QR code
6. Le webhook WAHA notifie le changement de status → mise à jour en DB
7. La session est prête, les Stories seront publiées au prochain cycle

---

## RÈGLES DE DÉVELOPPEMENT

1. **TypeScript strict** — `strict: true` dans tsconfig
2. **Prisma** pour tout accès DB — jamais de SQL raw sauf nécessité absolue
3. **API Routes Next.js** (App Router) — pas de serveur Express séparé
4. **Tailwind CSS + shadcn/ui** pour l'interface admin
5. **Fichiers uploadés** dans `/public/uploads/{campaignId}/` — servis en static par Next.js
6. **Gestion d'erreurs** — try/catch systématique sur les appels WAHA et IPRoyal avec logging
7. **Le CRON** est déclenché par un appel POST à `/api/scheduler/run` protégé par `CRON_SECRET` — appelé par un cron system ou Coolify scheduled task
8. **Pas de n8n** — tout est intégré dans l'app Next.js
9. **Les vidéos** doivent être envoyées avec `convert: true` pour que WAHA les convertisse en MP4 libx264
10. **Metadata WAHA** — les brands sont stockées en string comma-separated dans `metadata.brands` (ex: `"jungletech,taboo"`)

---

## DOCKER COMPOSE (pour Coolify)

```yaml
services:
  app:
    build: .
    container_name: mowhatsapp
    restart: always
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: "postgres://mowhatsapp:${DB_PASSWORD}@mowhatsapp-db:5432/mowhatsapp"
      WAHA_API_URL: "${WAHA_API_URL}"
      WAHA_API_KEY: "${WAHA_API_KEY}"
      API_IPROYAL: "${API_IPROYAL}"
      NEXTAUTH_SECRET: "${NEXTAUTH_SECRET}"
      NEXTAUTH_URL: "https://mowhatsapp.aseta.fr"
      CRON_SECRET: "${CRON_SECRET}"
    volumes:
      - uploads:/app/public/uploads
    depends_on:
      mowhatsapp-db:
        condition: service_healthy

  mowhatsapp-db:
    image: postgres:16-alpine
    container_name: mowhatsapp-db
    restart: always
    environment:
      POSTGRES_USER: mowhatsapp
      POSTGRES_PASSWORD: "${DB_PASSWORD}"
      POSTGRES_DB: mowhatsapp
    volumes:
      - mowhatsapp_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mowhatsapp"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  uploads:
    driver: local
  mowhatsapp_pgdata:
    driver: local
```

---

## ORDRE DE DÉVELOPPEMENT (Sprints)

### Sprint 1 — Fondations
- [ ] Init Next.js 14 + Prisma + PostgreSQL
- [ ] Schéma Prisma + migration
- [ ] Client WAHA (`src/lib/waha.ts`) avec tous les endpoints
- [ ] Client IPRoyal (`src/lib/iproyal.ts`)
- [ ] Layout admin avec sidebar (shadcn/ui)
- [ ] Page dashboard principal (stats: nb sessions, nb marques, nb publications)

### Sprint 2 — Gestion Marques & Campagnes
- [ ] CRUD Marques (API + UI)
- [ ] CRUD Campagnes par marque (API + UI)
- [ ] Upload contenu drag & drop (API multipart + UI avec react-dropzone)
- [ ] Réordonnement des contenus (position dans la boucle)
- [ ] Preview des contenus uploadés

### Sprint 3 — Proxy Manager
- [ ] Client IPRoyal — génération de proxies sticky par pays
- [ ] CRUD Proxies en DB
- [ ] Auto-assignation proxy à la création de session (max 2/proxy)
- [ ] Page admin proxies (pool, capacité, assignations)

### Sprint 4 — Sessions WhatsApp
- [ ] Page admin sessions (liste, statuts, metadata)
- [ ] Formulaire WhatsAppeur `/join` (public)
- [ ] Création auto session WAHA avec proxy + metadata
- [ ] Affichage QR code + polling statut
- [ ] Webhook réception WAHA → update status session en DB
- [ ] Possibilité d'assigner/retirer des marques par session

### Sprint 5 — Scheduler & Publication
- [ ] Logique scheduler complète (`src/lib/scheduler.ts`)
- [ ] Endpoint CRON `/api/scheduler/run` protégé
- [ ] Publication status image/vidéo/texte via WAHA
- [ ] PublishLog en DB avec statut sent/failed
- [ ] Page admin logs de publication (historique, filtres par marque/session)

### Sprint 6 — Polish & Monitoring
- [ ] Dashboard stats temps réel (publications/jour, taux de succès)
- [ ] Retry automatique sur publications failed
- [ ] Sync statut sessions WAHA ↔ DB (job périodique)
- [ ] Gestion erreurs UI (toasts, alertes)
- [ ] Dockerfile optimisé multi-stage

---

## DOCUMENTATION DE RÉFÉRENCE

- **WAHA Swagger** : https://waha.devlike.pro/swagger
- **WAHA Sessions** : https://waha.devlike.pro/docs/how-to/sessions/
- **WAHA Status/Stories** : https://waha.devlike.pro/docs/how-to/status/
- **WAHA Proxy** : https://waha.devlike.pro/docs/how-to/proxy/
- **WAHA Engines** : https://waha.devlike.pro/docs/how-to/engines/
- **IPRoyal API** : https://docs.iproyal.com/proxies/residential/api
- **IPRoyal Proxy format** : https://docs.iproyal.com/proxies/residential/proxy
- **Prisma** : https://www.prisma.io/docs
- **Next.js App Router** : https://nextjs.org/docs/app
- **shadcn/ui** : https://ui.shadcn.com
