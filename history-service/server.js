import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import amqp from 'amqplib';
import dotenv from 'dotenv';
import HistoryLog from './models/HistoryLog.js';
import { authenticateJWT, authorizeRoles } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB (History Database)'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// ==========================================
// RABBITMQ EVENT CONSUMER
// ==========================================
async function startRabbitMQConsumer() {
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    // 1. Assert topic exchange
    await channel.assertExchange('task_events', 'topic', { durable: true });

    // 2. Assert queue for history logs
    const queueName = 'history_service_queue';
    await channel.assertQueue(queueName, { durable: true });

    // 3. Bind queue to exchange with status changed routing key
    await channel.bindQueue(queueName, 'task_events', 'task.status_changed');

    console.log(`RabbitMQ Consumer started. Waiting for messages in queue: ${queueName}`);

    // 4. Start consuming messages
    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log('[RabbitMQ Consumer] Received status changed event:', content);

          // Save the log to MongoDB
          const log = new HistoryLog({
            taskId: content.taskId,
            taskTitle: content.taskTitle,
            projectId: content.projectId,
            oldStatus: content.oldStatus,
            newStatus: content.newStatus,
            changedBy: content.changedBy,
            timestamp: new Date(content.timestamp)
          });

          await log.save();
          console.log('[Database] Logged status change for task:', content.taskTitle);

          // Acknowledge receipt of the message
          channel.ack(msg);
        } catch (consumeError) {
          console.error('[RabbitMQ Consumer] Failed to process message:', consumeError.message);
          // Reject message and send it back to queue (requeue = true)
          channel.nack(msg, false, true); 
        }
      }
    });

  } catch (error) {
    console.error('Failed to start RabbitMQ consumer. Retrying in 5 seconds...', error.message);
    setTimeout(startRabbitMQConsumer, 5000);
  }
}

// Start consuming events
startRabbitMQConsumer();

// Health Check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'history-service' });
});

// ==========================================
// REST API ROUTES
// ==========================================

/**
 * 1. Fetch All History Logs (Only Managers can view full history)
 * GET /history
 */
app.get('/history', authenticateJWT, authorizeRoles('manager'), async (req, res) => {
  try {
    const logs = await HistoryLog.find().sort({ loggedAt: -1 }); // newest first
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. Fetch History Logs for a Specific Task (Managers & Members)
 * GET /history/task/:taskId
 */
app.get('/history/task/:taskId', authenticateJWT, async (req, res) => {
  try {
    const logs = await HistoryLog.find({ taskId: req.params.taskId }).sort({ loggedAt: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`History Service running on port ${PORT}`);
});
