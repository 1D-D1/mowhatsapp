# PROMPT CLAUDE CODE — Mo'WhatsApp

Lis CLAUDE.md et SKILL.md intégralement avant de commencer.

## Contexte
Tu développes Mo'WhatsApp, une régie publicitaire WhatsApp Stories. WAHA est déjà installé sur waha.aseta.fr (GOWS engine). Tu dois construire l'app Next.js qui gère les marques, campagnes, sessions WhatsApp, proxies IPRoyal, et le scheduler de publication automatique.

## Instructions
1. Commence par le Sprint 1 (Fondations) décrit dans SKILL.md
2. Init le projet Next.js 14 avec App Router, TypeScript strict, Tailwind, shadcn/ui
3. Copie le schéma Prisma depuis SKILL.md et lance la migration
4. Implémente les clients API (waha.ts, iproyal.ts) en suivant les patterns de CLAUDE.md
5. Crée le layout admin avec sidebar
6. Quand Sprint 1 est terminé, passe au Sprint 2, etc.

## Règles absolues
- JAMAIS de valeurs hardcodées pour les clés API — uniquement process.env
- TOUJOURS try/catch sur les appels externes (WAHA, IPRoyal)
- TOUJOURS logger les erreurs
- Les metadata WAHA utilisent des brands en comma-separated : "jungletech,taboo"
- Max 2 sessions par proxy IPRoyal
- Les vidéos sont envoyées avec convert: true à WAHA
- Le scheduler est un endpoint POST protégé par CRON_SECRET, pas un cron intégré

## Commence maintenant par le Sprint 1.
