# Evollis Support Agent 🤖

Agent de support client de première ligne pour Evollis, leader européen du Device as a Service.

## Stack technique

- **Backend** : Python + FastAPI
- **Base locale** : SQLite
- **LLM** : OpenAI — classification + génération de réponse
- **Frontend** : React + TypeScript + Vite
- **Infra** : Docker + Docker Compose (1 container backend interne, 1 container nginx public)

## Fonctionnement

L'agent classe chaque message entrant dans l'une des 4 catégories suivantes, puis adapte sa réponse en conséquence :

| Catégorie | Exemples |
|-----------|----------|
| 💳 **BILLING** | Prélèvement incorrect, résiliation, facture |
| 🔧 **TECHNICAL** | Appareil en panne, casse, garantie |
| 🔄 **TRADEIN** | Retour d'appareil, upgrade, fin de contrat |
| ℹ️ **GENERAL** | Comment ça marche, offres disponibles |

La classification et la réponse utilisent deux appels LLM séparés via l'API OpenAI pour maximiser la précision et la rapidité.

L'application propose aussi deux vues: une vue utilisateur pour discuter avec l'agent, et une vue admin pour suivre les tickets créés automatiquement à chaque échange. Les utilisateurs et tickets sont maintenant persistés dans une base SQLite locale (`backend/data/support.db`).

## Démarrage rapide

### Prérequis
- Docker & Docker Compose
- Une clé API OpenAI

### Lancement

```bash
git clone <repo>
cd evollis-support

# Créer le fichier d'environnement
echo "OPENAI_API_KEY=sk-..." > .env

# Démarrer
docker compose up --build
```

- Frontend + API : http://localhost:3000
- Docs API : http://localhost:3000/docs

### Sans Docker (dev local)

```bash
cd backend
pip install -r requirements.txt
OPENAI_API_KEY=sk-... uvicorn main:app --reload
# Démarrer aussi le frontend React si besoin
# cd ../frontend && npm install && npm run dev
```

## Architecture

```
[Browser] ──→ [nginx:3000]
                 ├──→ app React buildée
                 └──→ proxy → [FastAPI:8000] (/chat, /tickets, /health, /docs)
                          │
                          ├── OpenAI (classification)
                          └── OpenAI (réponse contextuelle)
```

## Arborescence

```text
takehome/
├── backend/
│   ├── main.py                # shim d'entrée minimal
│   └── app/
│       ├── main.py            # création de l'app FastAPI
│       ├── core/
│       │   ├── config.py      # config, chemins, variables d'env
│       │   └── prompts.py     # prompts, labels et templates
│       ├── schemas.py         # modèles Pydantic
│       ├── services/
│       │   ├── llm.py         # classification + génération
│       │   └── tickets.py     # stockage SQLite des tickets
│       └── api/routes/
│           ├── chat.py        # route /chat
│           ├── health.py      # route /health
│           └── tickets.py     # routes /tickets
├── frontend/
│   ├── src/                   # SPA React + TypeScript
│   └── Dockerfile             # build frontend
├── nginx/
│   └── default.conf           # reverse proxy Nginx vers le backend
└── docker-compose.yml         # déploiement local
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Clé API OpenAI (obligatoire pour les réponses LLM, fallback local si indisponible) |

---

## Ce que je ferais avec 3 jours de plus

Avec 3 jours supplémentaires, je commencerais par connecter une vraie base de données (PostgreSQL) pour persister les conversations et générer des métriques de support (volume par catégorie, taux de résolution, temps de réponse moyen). J'intégrerais ensuite un système d'escalade automatique : si l'agent détecte que le client est bloqué après 2-3 échanges ou exprime de la frustration (analyse de sentiment), la conversation est transférée vers un agent humain avec tout le contexte déjà résumé. Enfin, j'ajouterais une authentification légère (numéro de contrat + email) pour que l'agent puisse accéder aux vraies données du client via l'API Evollis — ce qui permettrait de répondre à des questions précises ("votre prochain prélèvement est le 15 juin pour 29,90€") plutôt que des réponses génériques, et de déclencher des actions réelles (report de prélèvement, demande de swap d'appareil).
