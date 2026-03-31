# CLAUDE.md — Mo'WhatsApp Project Configuration

## Project overview
Mo'WhatsApp is a WhatsApp Stories advertising platform. It manages brands, campaigns with rotating content loops (1-7 day frequencies), WhatsApp sessions via WAHA GOWS API, and IPRoyal proxy auto-assignment. Built with Next.js 14 App Router, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui.

## Key files
- `SKILL.md` — Complete project spec, DB schema, API references, architecture
- `prisma/schema.prisma` — Database schema (copy from SKILL.md)
- `src/lib/waha.ts` — WAHA API client (all WhatsApp operations)
- `src/lib/iproyal.ts` — IPRoyal API client (proxy generation)
- `src/lib/scheduler.ts` — CRON job logic for Story publishing
- `src/lib/proxy-manager.ts` — Auto-assign proxies to sessions

## Before coding
1. READ `SKILL.md` completely before starting any sprint
2. Check the current sprint in the sprint list
3. Never hardcode API keys — always use `process.env.*`

## Environment variables (NEVER hardcode)
- `WAHA_API_URL` — Base URL of WAHA instance (https://waha.aseta.fr)
- `WAHA_API_KEY` — API key for WAHA
- `WAHA_DASHBOARD_USER` — WAHA dashboard username
- `WAHA_DASHBOARD_PASS` — WAHA dashboard password
- `API_IPROYAL` — IPRoyal API bearer token
- `DATABASE_URL` — PostgreSQL connection string
- `CRON_SECRET` — Secret to protect scheduler endpoint
- `NEXTAUTH_SECRET` — NextAuth secret for admin auth

## Commands
- `npm run dev` — Start development server
- `npx prisma migrate dev` — Run DB migrations
- `npx prisma generate` — Generate Prisma client
- `npx prisma studio` — Open Prisma Studio (DB GUI)
- `npm run build` — Production build
- `npm run lint` — Lint check

## Code style
- TypeScript strict mode
- Prisma for all DB access (no raw SQL)
- Next.js App Router API routes (not Pages Router)
- Tailwind CSS + shadcn/ui components
- try/catch on all external API calls (WAHA, IPRoyal)
- Server Components by default, Client Components only when needed (forms, interactive)

## WAHA API patterns
```typescript
// Always use this pattern for WAHA calls
const wahaFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${process.env.WAHA_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.WAHA_API_KEY!,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`WAHA ${res.status}: ${await res.text()}`);
  return res.json();
};
```

## IPRoyal API patterns
```typescript
// Always use this pattern for IPRoyal calls
const ipRoyalFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`https://resi-api.iproyal.com/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.API_IPROYAL}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`IPRoyal ${res.status}: ${await res.text()}`);
  return res.json();
};
```

## WAHA session metadata convention
Brands are stored as comma-separated slugs in metadata:
```json
{
  "config": {
    "metadata": {
      "brands": "jungletech,taboo",
      "managedBy": "mowhatsapp"
    }
  }
}
```

## Proxy rules
- Max 2 WAHA sessions per IPRoyal proxy
- Use sticky sessions (same IP) per WhatsApp account
- Target country: `_country-gf` (Guyane française) by default
- Session name used as sticky session ID: `_session-{wahaSessionName}`

## File upload rules
- Store in `/public/uploads/{campaignId}/`
- Accept: image/jpeg, image/png, video/mp4
- Max file size: 50MB
- Videos sent to WAHA with `convert: true`

## Scheduler rules
- Triggered via POST `/api/scheduler/run` with header `X-Cron-Secret`
- Runs daily, checks each active campaign
- Formula: `daysSinceStart % campaign.loopDays === 0` → publish day
- Content rotation: `contentIndex = Math.floor(daysSinceStart / loopDays) % totalContents`
- Log every publish attempt (success or failure) in PublishLog table
