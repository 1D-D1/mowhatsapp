# MO'WHATSAPP - PHASE 2
# Front-office (vente) + Client back-office (annonceurs) + Bugs Phase 1

---

## BUGS PHASE 1 A CORRIGER EN PRIORITE

### BUG 1 - Proxies non assignes automatiquement
**Fichier** : `src/app/api/sessions/route.ts` ligne 100 et 133
**Probleme** : `wahaCreateSession()` est appele SANS proxy et `proxyId: null` en base.
Le `proxy-manager.ts` (assignProxyToSession) existe mais n'est JAMAIS appele.

**Fix** : Avant de creer la session WAHA, appeler `assignProxyToSession(sessionName)` pour :
1. Trouver un proxy dispo dans le pool (ou en generer via IPRoyal)
2. Passer le proxy config a `wahaCreateSession()`
3. Sauvegarder le `proxyId` en base

### BUG 2 - Webhook URL pointe vers le domaine externe
**Fix applique** : `WAHA_API_URL` corrige en `http://waha-z0gs0cwo0gwokc8s0gwc8448:3000`
**A faire** : Ajouter `WAHA_CALLBACK_URL` pour le webhook interne.

---

## ARCHITECTURE PHASE 2

### 3 espaces distincts

```
mowhatsapp.aseta.fr/              -> Front-office (public, vente)
mowhatsapp.aseta.fr/admin/        -> Back-office admin (Lucas)
mowhatsapp.aseta.fr/dashboard/    -> Back-office annonceur (client)
```

---

## FRONT-OFFICE

- Landing page
- Pricing (Starter 79E/mois, Pro 199E/mois, Business 399E/mois)
- Stripe Checkout (abonnement mensuel)

## CLIENT DASHBOARD

- Auth NextAuth.js (credentials)
- Roles : ADMIN vs ADVERTISER
- Stats, campagnes, content upload, sessions (lecture), analytics, promo codes, billing

## COMMISSION / PROMO

- Mode 1 : WooCommerce installe = commission verifiee automatiquement
- Mode 2 : Declaratif = commission sur declaration annonceur
- Parametrage % reduction + % commission par annonceur

## PHASES

- 2.1 : Fix bugs + Auth
- 2.2 : Client dashboard
- 2.3 : Front-office + Stripe
- 2.4 : Commission / Promo
- 2.5 : Polish

Voir le fichier complet PHASE-2.md dans le projet pour tous les details.
