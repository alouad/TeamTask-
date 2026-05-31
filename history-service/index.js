require('dotenv').config();
const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3004;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/teamtask';

app.use(express.json());
app.use(cors());

mongoose.set('strictQuery', false);

const historySchema = new mongoose.Schema({
  type: { type: String, required: true },
  taskId: { type: String, required: true },
  projectId: { type: String },
  titre: { type: String },
  assigneA: { type: String },
  ancienStatut: { type: String },
  nouveauStatut: { type: String },
  utilisateur: { type: String },
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const History = mongoose.model('History', historySchema);

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange('task_events', 'fanout', { durable: true });
    const queue = await channel.assertQueue('history_queue', { durable: true });
    await channel.bindQueue(queue.queue, 'task_events', '');

    await channel.consume(queue.queue, async (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        console.log('📥 Événement reçu:', event);

        await History.create({
          type: event.type,
          taskId: event.taskId?.toString(),
          projectId: event.projectId?.toString(),
          titre: event.titre,
          assigneA: event.assigneA,
          ancienStatut: event.ancienStatut,
          nouveauStatut: event.nouveauStatut,
          utilisateur: event.utilisateur,
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date()
        });

        channel.ack(msg);
      }
    });

    console.log('✅ History Service connecté à RabbitMQ');
  } catch (error) {
    console.error('❌ Erreur connexion RabbitMQ:', error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

app.get('/history', async (req, res) => {
  try {
    const histories = await History.find().sort({ timestamp: -1 });
    res.status(200).json({ message: 'Historique complet', count: histories.length, histories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.get('/history/task/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const taskHistories = await History.find({ taskId }).sort({ timestamp: -1 });
    res.status(200).json({ message: `Historique de la tâche ${taskId}`, count: taskHistories.length, histories: taskHistories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.get('/', async (req, res) => {
  try {
    const historyCount = await History.countDocuments();
    res.json({ service: 'History Service', version: '1.0.0', status: 'running', historyCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ History Service connecté à MongoDB');
    await connectRabbitMQ();

    app.listen(PORT, () => {
      console.log(`✅ History Service démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Impossible de se connecter à MongoDB:', error.message);
    process.exit(1);
  }
};

startServer().catch(console.error);
