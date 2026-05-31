require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const amqp = require('amqplib');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_in_production';
const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || 'http://project-service:3002';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/teamtask';

app.use(express.json());
app.use(cors());

mongoose.set('strictQuery', false);

const taskSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  titre: { type: String, required: true },
  assigneA: { type: String, required: true },
  statut: { type: String, default: 'à faire' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date }
});

const Task = mongoose.model('Task', taskSchema);

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange('task_events', 'fanout', { durable: true });
    console.log('✅ Connecté à RabbitMQ');
  } catch (error) {
    console.error('❌ Erreur connexion RabbitMQ:', error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

async function publishTaskEvent(event) {
  if (channel) {
    await channel.publish('task_events', '', Buffer.from(JSON.stringify(event)));
  }
}

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

app.post('/tasks', authenticateToken, async (req, res) => {
  const { projectId, titre, assigneA } = req.body;

  if (!projectId || !titre || !assigneA) {
    return res.status(400).json({ message: 'projectId, titre et assigneA requis' });
  }

  try {
    await axios.get(`${PROJECT_SERVICE_URL}/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${req.headers.authorization.split(' ')[1]}`
      }
    });

    const newTask = await Task.create({
      projectId: projectId.toString(),
      titre,
      assigneA,
      statut: 'à faire',
      createdBy: req.user.email
    });

    await publishTaskEvent({
      type: 'TASK_CREATED',
      taskId: newTask._id,
      projectId,
      titre,
      assigneA,
      timestamp: new Date()
    });

    res.status(201).json({ message: 'Tâche créée avec succès', task: newTask });
  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error.message);
    res.status(error.response?.status || 500).json({ message: error.response?.data?.message || 'Erreur serveur interne' });
  }
});

app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json({ message: 'Liste des tâches', count: tasks.length, tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.patch('/tasks/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Tâche non trouvée' });
    }

    const ancienStatut = task.statut;
    task.statut = statut;
    task.modifiedAt = new Date();
    await task.save();

    await publishTaskEvent({
      type: 'TASK_STATUS_CHANGED',
      taskId: task._id,
      projectId: task.projectId,
      ancienStatut,
      nouveauStatut: statut,
      utilisateur: req.user.email,
      timestamp: new Date()
    });

    res.status(200).json({ message: 'Statut de la tâche mis à jour', task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.get('/', async (req, res) => {
  try {
    const taskCount = await Task.countDocuments();
    res.json({ service: 'Task Service', version: '1.0.0', status: 'running', taskCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Task Service connecté à MongoDB');
    await connectRabbitMQ();

    app.listen(PORT, () => {
      console.log(`✅ Task Service démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Impossible de se connecter à MongoDB:', error.message);
    process.exit(1);
  }
};

startServer().catch(console.error);
