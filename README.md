# Evollis Support Agent

Agent de support client de première ligne pour Evollis, orienté abonnements, incidents matériels, reprise d'appareils et questions générales.

## Stack technique

- **Backend** : Python + FastAPI
- **Base locale** : SQLite
- **LLM** : OpenAI ou Groq, avec fallback local si le provider n'est pas disponible
- **Frontend** : React + TypeScript + Vite
- **Infra** : Docker + Docker Compose + Nginx reverse proxy

## Fonctionnement

L'application prend un message client, le classe puis répond selon son type :

| Catégorie | Exemples |
|----------|----------|
| `BILLING` | prélèvement incorrect, facture, résiliation |
| `TECHNICAL` | appareil en panne, batterie, écran, garantie |
| `TRADEIN` | fin de contrat, reprise, retour, upgrade |
| `GENERAL` | fonctionnement Evollis, offre, question générale |

Le comportement de l'agent repose sur trois niveaux :

1. classification du message
2. génération de réponse via un provider LLM si disponible
3. fallback local contextuel si le provider échoue ou n'est pas configuré

Chaque demande est persistée en base avec :

- un ticket principal
- l'historique des messages de la demande
- un rattachement utilisateur

Le frontend permet aussi de :

- créer un compte utilisateur
- reprendre une ancienne demande
- ouvrir une nouvelle demande distincte
- consulter une FAQ Evollis
- accéder à une vue admin protégée par identifiants d'environnement

## Fonctionnalités principales

### Vue utilisateur

- authentification utilisateur légère par email + mot de passe
- discussion avec l'agent
- continuité de conversation sur une même demande
- reprise d'une ancienne demande depuis `Mes demandes`
- ouverture d'une nouvelle demande via `Nouvelle demande`
- FAQ flottante
- aide rapide d'utilisation du chatbot

### Vue admin

- login admin dédié
- supervision des tickets
- filtres par statut et catégorie
- changement de statut d'un ticket
- diagnostic du provider LLM

## Persistance des données

Les données sont stockées dans SQLite via `backend/data/support.db` avec notamment :

- `users`
- `tickets`
- `ticket_messages`

Une migration automatique importe les anciens `users.json` et `tickets.json` si ces fichiers existent encore.

## Providers LLM

Le backend peut utiliser :

- `openai`
- `groq`

Le provider actif est piloté par `LLM_PROVIDER`.

Si le provider n'est pas utilisable :

- l'application continue avec un fallback local
- l'admin peut le voir via le diagnostic
- le frontend affiche un message propre à l'utilisateur et met en avant la FAQ

## Démarrage rapide

### Prérequis

- Docker et Docker Compose
- une clé API OpenAI ou Groq

### Variables d'environnement

Créer un `.env` à la racine :

```bash
OPENAI_API_KEY=
GROQ_API_KEY=
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-3.5-turbo
GROQ_MODEL=llama-3.1-8b-instant
GROQ_API_BASE=https://api.groq.com/openai/v1
ADMIN_EMAIL=admin@evollis.local
ADMIN_PASSWORD=admin123
```

### Lancement

```bash
docker compose up --build
```

Accès :

- application : `http://localhost:3000`
- docs FastAPI : `http://localhost:3000/docs`

## Développement local

### Backend

```bash
cd backend
pip install -r requirements.txt
OPENAI_API_KEY=... uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Architecture

```text
[Browser] ──→ [nginx:3000]
                 ├──→ app React buildée
                 └──→ proxy → [FastAPI:8000]
                          ├── /chat
                          ├── /auth/*
                          ├── /tickets
                          ├── /health
                          └── /health/openai
```

## Structure du repo

```text
takehome/
├── backend/
│   ├── main.py
│   └── app/
│       ├── main.py
│       ├── core/
│       │   ├── config.py
│       │   └── prompts.py
│       ├── schemas.py
│       ├── services/
│       │   ├── admin.py
│       │   ├── db.py
│       │   ├── llm.py
│       │   ├── tickets.py
│       │   └── users.py
│       └── api/routes/
│           ├── auth.py
│           ├── chat.py
│           ├── health.py
│           └── tickets.py
├── frontend/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   ├── Dockerfile
│   └── default.conf
├── docker-compose.yml
└── README.md
```

## CI

La CI vérifie :

- typecheck et build du frontend React
- compilation backend
- build et démarrage Docker
- test `/health`
- test `register`
- test `/chat`

## Ce que je ferais avec 3 jours de plus

Avec 3 jours de plus, je me concentrerais sur ce qui est réaliste à livrer rapidement tout en augmentant fortement la robustesse du produit.

### 1. Passer d'une base locale à une vraie base applicative

Je migrerais la persistance SQLite vers PostgreSQL pour avoir une base plus adaptée à une application multi-environnements et à une montée en charge progressive.

Cela inclurait :

- migrations de schéma propres
- séparation claire entre données locales et données de déploiement
- configuration d'environnement plus rigoureuse

### 2. Mieux gérer le contexte conversationnel

Aujourd'hui, l'historique est stocké et déjà partiellement exploité. L'étape suivante serait de mieux contrôler ce qui est envoyé au modèle pour améliorer la continuité et réduire les coûts en tokens.

Je mettrais en place :

- un résumé glissant de la conversation
- une mémoire de faits clés par demande
- une séparation entre contexte système, résumé, faits et derniers messages utiles

La cible serait :

- `ticket_messages` pour l'historique brut
- `ticket_summary` pour un résumé vivant
- `ticket_memory` pour les faits structurés
- seulement les derniers messages utiles dans le prompt final

### 3. Renforcer la sécurité minimale du produit

Je renforcerais ce qui est le plus critique à court terme :

- séparation plus nette entre rôles user/admin
- validation plus stricte des entrées
- premiers garde-fous contre la prompt injection
- bases de protection contre XSS et futures injections SQL
- rate limiting sur les prompts pour éviter les abus et mieux contrôler les coûts

### 4. Rendre la couche LLM plus robuste

J'irais vers une abstraction multi-provider plus propre pour pouvoir basculer selon les quotas, la disponibilité ou le coût des modèles.

L'idée serait de gérer plus proprement :

- disponibilité du provider
- quota atteint
- fallback ordonné
- choix du modèle selon le niveau de qualité attendu

### 5. Améliorer l'expérience produit

J'ajouterais deux briques simples mais utiles :

- une collecte de feedback en fin de demande
- une meilleure relance ou escalade quand l'utilisateur reste bloqué après plusieurs échanges

## Plus loin encore

Au-delà de ce qui est faisable en 3 jours, j'irais vers une version plus proche d'un vrai environnement de production.

### 1. Vrai environnement de prod

Aujourd'hui, une solution comme Vercel peut être pratique pour une mise en ligne rapide, surtout côté frontend. À plus long terme, je migrerais vers un vrai cloud provider ou un VPS avec une stratégie de déploiement plus robuste, puis vers une orchestration type Kubernetes ou équivalent dès que le besoin de scalabilité, de résilience et de standardisation d'exploitation devient réel.

Cela inclurait :

- séparation dev / preview / prod
- gestion propre des secrets et variables d'environnement
- base PostgreSQL managée ou dédiée
- déploiement reproductible avec des outils comme Terraform et Ansible
- chaîne de CD plus complète avec GitHub Actions ou ArgoCD
- migration vers Kubernetes ou un équivalent managé pour industrialiser le déploiement

### 2. Infra plus robuste

Je renforcerais l'exposition externe avec :

- HTTPS côté Nginx
- rate limiting global
- load balancing
- politiques de sauvegarde et reprise

### 3. Observabilité complète

Je mettrais en place une vraie base de monitoring avec :

- Prometheus
- alerting
- healthchecks avancés
- métriques métier
- Grafana pour les dashboards
