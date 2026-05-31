# 🚀 TeamTask - Plateforme Cloud Native de Gestion de Tâches

## 📋 Vue d'ensemble

TeamTask est une plateforme microservices complète pour la gestion de tâches en équipe. Elle comprend :
- **Auth Service** : Gestion de l'authentification JWT
- **Project Service** : CRUD des projets
- **Task Service** : Gestion des tâches (fourni par Personne 2)
- **History Service** : Enregistrement automatique de l'historique via RabbitMQ (fourni par Personne 2)

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Clients       │
│ (Postman/Front) │
└────────┬────────┘
         │
    ┌────┴─────────────────────────┐
    ▼                              ▼
┌──────────────┐          ┌─────────────────┐
│ Auth Service │◄────────►│ Project Service │
│  (Port 3001) │          │  (Port 3002)    │
└──────────────┘          └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │  Task Service   │
                          │  (Port 3003)    │
                          └────────┬────────┘
                                   │(RabbitMQ)
                                   ▼
                          ┌─────────────────┐
                          │ History Service │
                          │ (Port 3004)     │
                          └─────────────────┘
```

---

## 🛠️ Prérequis

- Docker & Docker Compose
- Node.js 18+ (pour développement local)
- Postman (pour tester les APIs)

---

## � Base de données
Cette plateforme utilise maintenant MongoDB pour la persistance des données.

## �🚀 Démarrage rapide

### Option 1 : Avec Docker Compose (Recommandé)

```bash
# Cloner/accéder au projet
cd teamtask

# Démarrer tous les services
docker-compose up --build

# Vérifier que tous les services sont en ligne
docker ps
```

**URLs des services :**
- Auth Service : http://localhost:3001
- Project Service : http://localhost:3002
- Task Service : http://localhost:3003
- History Service : http://localhost:3004
- RabbitMQ Management : http://localhost:15672 (guest/guest)

### Option 2 : Développement local (sans Docker)

#### 1. Démarrer RabbitMQ (optionnel pour développement local)
```bash
# Vous pouvez l'ignorer si vous ne testez que Auth & Project
```

#### 2. Auth Service
```bash
cd auth-service
npm install
npm start
# Écoute sur http://localhost:3001
```

#### 3. Project Service (dans un nouveau terminal)
```bash
cd project-service
npm install
npm start
# Écoute sur http://localhost:3002
```

---

## 🔐 Authentication - Flux complet

### 1️⃣ S'enregistrer
```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "password123",
    "role": "manager"
  }'
```

**Réponse :**
```json
{
  "message": "Utilisateur créé avec succès",
  "user": {
    "id": 2,
    "email": "alice@test.com",
    "role": "manager"
  }
}
```

### 2️⃣ Se connecter et récupérer le JWT
```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "password123"
  }'
```

**Réponse :**
```json
{
  "message": "Authentification réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "email": "alice@test.com",
    "role": "manager"
  }
}
```

### 3️⃣ Vérifier le token
```bash
curl -X GET http://localhost:3001/verify \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 📁 Gestion des Projets

### 📖 Récupérer tous les projets
```bash
curl -X GET http://localhost:3002/projects \
  -H "Authorization: Bearer <TOKEN>"
```

### 📖 Récupérer un projet par ID
```bash
curl -X GET http://localhost:3002/projects/1 \
  -H "Authorization: Bearer <TOKEN>"
```

### ✨ Créer un projet (Manager uniquement)
```bash
curl -X POST http://localhost:3002/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MANAGER_TOKEN>" \
  -d '{
    "name": "Nouveau Projet",
    "description": "Description du projet",
    "endDate": "2025-12-31"
  }'
```

### ✏️ Mettre à jour un projet (Manager uniquement)
```bash
curl -X PATCH http://localhost:3002/projects/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MANAGER_TOKEN>" \
  -d '{
    "name": "Nom Mis à Jour",
    "description": "Nouvelle description",
    "endDate": "2025-06-30"
  }'
```

### 🗑️ Supprimer un projet (Manager uniquement)
```bash
curl -X DELETE http://localhost:3002/projects/1 \
  -H "Authorization: Bearer <MANAGER_TOKEN>"
```

---

## 🧪 Tests Postman

### Importer la collection

1. Ouvrir Postman
2. Cliquer sur **Import**
3. Sélectionner le fichier `postman_collection.json`
4. La collection est maintenant disponible

### Tester les endpoints

**Séquence de test recommandée :**

1. **🔐 Health Check Auth** - Vérifier que le service Auth fonctionne
2. **Register** - Créer un nouvel utilisateur manager
3. **Login** - Récupérer le JWT
4. **Verify Token** - Valider le JWT
5. **Health Check Project** - Vérifier que le service Project fonctionne
6. **Get All Projects** - Récupérer la liste des projets (utiliser le JWT)
7. **Create Project** - Créer un nouveau projet (Manager uniquement)
8. **Update Project** - Modifier un projet
9. **Delete Project** - Supprimer un projet

---

## 🔑 Rôles et Permissions

| Action | Manager | Member |
|--------|---------|--------|
| Se connecter | ✅ | ✅ |
| Consulter projets | ✅ | ✅ |
| Créer projet | ✅ | ❌ |
| Modifier projet | ✅ | ❌ |
| Supprimer projet | ✅ | ❌ |
| Créer tâche | ✅ | ✅ |
| Modifier statut tâche | ✅ | ✅ |
| Voir historique | ✅ | ✅ |

---

## 🐛 Dépannage

### Erreur : Connection refused sur port 3001/3002

**Solution :** Vérifier que les services sont lancés
```bash
# Avec Docker Compose
docker-compose ps

# Ou localement
netstat -an | grep 3001
```

### Erreur : "Token invalide ou expiré"

**Solution :** S'authentifier à nouveau pour obtenir un nouveau token

### RabbitMQ n'est pas accessible

**Solution :** Vérifier que le service RabbitMQ est en cours d'exécution
```bash
docker-compose logs rabbitmq
```

---

## 📚 Structure du Projet

```
teamtask/
├── auth-service/           # Service d'authentification (Personne 1)
│   ├── index.js
│   ├── Dockerfile
│   ├── package.json
│   └── .env
├── project-service/        # Service de gestion des projets (Personne 1)
│   ├── index.js
│   ├── Dockerfile
│   ├── package.json
│   └── .env
├── task-service/           # Service de gestion des tâches (Personne 2)
│   ├── index.js
│   ├── Dockerfile
│   ├── package.json
│   └── .env
├── history-service/        # Service d'historique (Personne 2)
│   ├── index.js
│   ├── Dockerfile
│   ├── package.json
│   └── .env
├── docker-compose.yml      # Orchestration des services
├── postman_collection.json # Tests API
└── README.md              # Ce fichier
```

---

## 👤 Utilisateurs par défaut

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| manager@test.com | password123 | manager |

---

## 📞 Support

Pour des questions, consultez la documentation détaillée dans chaque service ou contactez l'équipe de développement.

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-15
