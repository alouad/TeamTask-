require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_in_production';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/teamtask';

app.use(express.json());
app.use(cors());

mongoose.set('strictQuery', false);

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  endDate: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token d\'authentification manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token invalide ou expiré' });
  }
};

const requireManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Accès refusé. Seuls les managers peuvent effectuer cette action.' });
  }
  next();
};

app.get('/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json({ message: 'Liste des projets', count: projects.length, projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.get('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    res.status(200).json({ message: 'Projet trouvé', project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.post('/projects', authenticateToken, requireManager, async (req, res) => {
  const { name, description, endDate } = req.body;
  if (!name || !endDate) {
    return res.status(400).json({ message: 'Nom et date de fin requis' });
  }

  try {
    const newProject = await Project.create({
      name,
      description: description || '',
      endDate,
      createdBy: req.user.email
    });
    res.status(201).json({ message: 'Projet créé avec succès', project: newProject });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.patch('/projects/:id', authenticateToken, requireManager, async (req, res) => {
  const { name, description, endDate } = req.body;
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (endDate !== undefined) project.endDate = endDate;
    await project.save();

    res.status(200).json({ message: 'Projet mis à jour avec succès', project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.delete('/projects/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }
    res.status(200).json({ message: 'Projet supprimé avec succès', project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.get('/', async (req, res) => {
  try {
    const projectCount = await Project.countDocuments();
    res.json({ service: 'Project Service', version: '1.0.0', status: 'running', projectCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Project Service connecté à MongoDB');
    app.listen(PORT, () => {
      console.log(`✅ Project Service démarré sur http://localhost:${PORT}`);
      console.log(`JWT Secret: ${JWT_SECRET}`);
    });
  } catch (error) {
    console.error('❌ Impossible de se connecter à MongoDB:', error.message);
    process.exit(1);
  }
};

startServer();
