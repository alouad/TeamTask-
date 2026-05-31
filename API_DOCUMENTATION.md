# 📚 Documentation des APIs TeamTask

## 🔐 AUTH SERVICE (Port 3001)

### POST /register
Crée un nouvel utilisateur.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "manager" // ou "member"
}
```

**Response (201):**
```json
{
  "message": "Utilisateur créé avec succès",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "manager"
  }
}
```

**Erreurs:**
- 400: Email ou mot de passe manquant
- 409: Utilisateur déjà existant

---

### POST /login
Authentifie un utilisateur et retourne un JWT.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Authentification réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "manager"
  }
}
```

**Erreurs:**
- 400: Email ou mot de passe manquant
- 401: Utilisateur non trouvé ou mot de passe incorrect

---

### GET /verify
Vérifie si un JWT est valide.

**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
  "message": "Token valide",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "manager"
  }
}
```

**Erreurs:**
- 401: Token manquant ou invalide

---

### GET /
Health check du service Auth.

**Response (200):**
```json
{
  "service": "Auth Service",
  "version": "1.0.0",
  "status": "running",
  "users": [...]
}
```

---

## 📁 PROJECT SERVICE (Port 3002)

### GET /projects
Récupère tous les projets (authentification requise).

**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
  "message": "Liste des projets",
  "count": 2,
  "projects": [
    {
      "id": 1,
      "name": "Site Web",
      "description": "Création du site web",
      "endDate": "2025-06-01",
      "createdBy": "manager@test.com",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /projects/:id
Récupère un projet spécifique par son ID.

**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
  "message": "Projet trouvé",
  "project": {
    "id": 1,
    "name": "Site Web",
    "description": "Création du site web",
    "endDate": "2025-06-01",
    "createdBy": "manager@test.com",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

**Erreurs:**
- 404: Projet non trouvé

---

### POST /projects
Crée un nouveau projet (Manager uniquement).

**Headers:**
```
Authorization: Bearer <MANAGER_TOKEN>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Nouveau Projet",
  "description": "Description du projet",
  "endDate": "2025-12-31"
}
```

**Response (201):**
```json
{
  "message": "Projet créé avec succès",
  "project": {
    "id": 2,
    "name": "Nouveau Projet",
    "description": "Description du projet",
    "endDate": "2025-12-31",
    "createdBy": "manager@test.com",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Erreurs:**
- 400: Nom ou date de fin manquant
- 401: Token manquant
- 403: Utilisateur non manager

---

### PATCH /projects/:id
Met à jour un projet (Manager uniquement).

**Headers:**
```
Authorization: Bearer <MANAGER_TOKEN>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Nom Mis à Jour",
  "description": "Nouvelle description",
  "endDate": "2025-07-15"
}
```

**Response (200):**
```json
{
  "message": "Projet mis à jour avec succès",
  "project": {
    "id": 1,
    "name": "Nom Mis à Jour",
    "description": "Nouvelle description",
    "endDate": "2025-07-15",
    "createdBy": "manager@test.com",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

**Erreurs:**
- 404: Projet non trouvé
- 403: Utilisateur non manager

---

### DELETE /projects/:id
Supprime un projet (Manager uniquement).

**Headers:**
```
Authorization: Bearer <MANAGER_TOKEN>
```

**Response (200):**
```json
{
  "message": "Projet supprimé avec succès",
  "project": {
    "id": 1,
    "name": "Site Web",
    "description": "Création du site web",
    "endDate": "2025-06-01",
    "createdBy": "manager@test.com",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

**Erreurs:**
- 404: Projet non trouvé
- 403: Utilisateur non manager

---

### GET /
Health check du service Project.

**Response (200):**
```json
{
  "service": "Project Service",
  "version": "1.0.0",
  "status": "running",
  "projectCount": 2
}
```

---

## 📌 Notes importantes

1. **Token JWT** : Tous les endpoints protégés nécessitent un header `Authorization: Bearer <TOKEN>`
2. **Rôles** :
   - `manager` : Accès complet (CRUD sur projets)
   - `member` : Lecture seule (GET sur projets)
3. **Validité du token** : 24 heures après la connexion
4. **Format de réponse** : Tous les endpoints retournent du JSON

---

## 🔗 Communication inter-services

- **Task Service** vérifie l'existence d'un projet via : `GET /projects/:id`
- **Task Service** publie des événements à **History Service** via RabbitMQ
- Tous les services utilisent le même `JWT_SECRET` pour valider les tokens

---

**Version:** 1.0.0
