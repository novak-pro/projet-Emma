# ProjetEmma

Application web responsive pour collecter, cartographier et analyser l'état des routes au Cameroun. 
Les citoyens signalent les nids-de-poule/dégradations sans compte ; seul l'administrateur se connecte pour traiter et analyser les données.

## Structure

```
Projet-Emma/
├── BACK/      # API Fastify + Prisma + PostgreSQL
├── FRONT/     # React + Vite + TypeScript + Tailwind + Leaflet + PWA
├── ANALYSIS/  # Service d'analyse FastAPI + pandas + scikit-learn
└── docker-compose.yml
```

## Prérequis

- Node.js 20+
- Python 3.11+
- Docker Desktop (pour PostgreSQL)

## Installation & lancement

### 1) Base de données
```bash
docker compose up -d db
```
Adminer disponible sur http://localhost:8080 (système : PostgreSQL, serveur : db, utilisateur : projetemma, mot de passe : projetemma, base : projetemma).

### 2) Backend (API)
```bash
cd BACK
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```
API : http://localhost:3000

### 3) Frontend
```bash
cd FRONT
npm install
npm run dev
```
Site : http://localhost:5173

### 4) Service d'analyse (Python)
```bash
cd ANALYSIS
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# Linux/Mac
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Service : http://localhost:8000

## Comptes

- **Administrateur** : `admin@admin.cm` / `admin123`

## Fonctionnalités

- **Public** : formulaire sans connexion, géolocalisation GPS, carte Leaflet (déplaçable), recherche Nominatim (Cameroun), ajout de photos (compressées), carte satellite/plan.
- **Admin** : tableau de bord, gestion des signalements (statut/gravité), export CSV, analyses statistiques, clustering DBSCAN, prévision linéaire.
- **Analyse Python** : classification automatique (score + classe de gravité), regroupement spatial, tendances mensuelles.

## Cartographie

Par défaut Leaflet + OpenStreetMap (gratuit). Pour un meilleur rendu, ajouter `VITE_MAPTILER_KEY` dans `FRONT/.env`. La recherche/adressage utilise Nominatim (respecter la limite 1 req/s).

## Remarques

- PostgreSQL en Float pour lat/lng (suffisant pour ce projet). Prisma JS utilisé pour le backend (le client Python Prisma était abandonné).
- Photos stockées dans `BACK/uploads/` en développement.
- Le service d'analyse lit directement la base PostgreSQL.
