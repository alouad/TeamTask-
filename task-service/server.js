import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import Task from './models/Task.js';
import { connectRabbitMQ, publishEvent } from './rabbitmq.js';
import { authenticateJWT, authorizeRoles } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB (Task Database)'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// Initialize RabbitMQ
connectRabbitMQ();

// Health Check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'task-service' });
});

// ==========================================
// REST API ROUTES (Protected with JWT)
// ==========================================

/**
 * 1. Create a Task (Only Managers can create tasks)
 * POST /tasks
 */
app.post('/tasks', authenticateJWT, authorizeRoles('manager'), async (req, res) => {
  const { title, description, projectId, assignedUser } = req.body;

  if (!title || !projectId) {
    return res.status(400).json({ error: 'Title and ProjectId are required' });
  }

  try {
    // REST Communication: Verify project existence from project-service (Personne 1)
    const projectServiceUrl = process.env.PROJECT_SERVICE_URL || 'http://localhost:5001';
    console.log(`[REST] Verifying project existence at: ${projectServiceUrl}/projects/${projectId}`);
    
    try {
      const response = await axios.get(`${projectServiceUrl}/projects/${projectId}`, {
        headers: { Authorization: req.headers.authorization } // pass along the JWT token
      });
      
      if (!response.data) {
        return res.status(404).json({ error: 'Project not found' });
      }
    } catch (restError) {
      // Robustness: If the project service is offline (Connection Refused), 
      // log a warning but allow creation for local testing. If it returns 404, reject.
      if (restError.code === 'ECONNREFUSED') {
        console.warn('[REST WARNING] Project Service is offline. Skipping validation for testing purposes.');
      } else if (restError.response && restError.response.status === 404) {
        return res.status(404).json({ error: 'Project not found in Project Service' });
      } else {
        console.error('[REST ERROR] Failed to validate project:', restError.message);
        return res.status(500).json({ error: 'Failed to validate project with Project Service' });
      }
    }

    // Save task
    const newTask = new Task({
      title,
      description,
      projectId,
      assignedUser
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. Get all Tasks (Managers & Members)
 * GET /tasks
 */
app.get('/tasks', authenticateJWT, async (req, res) => {
  try {
    const tasks = await Task.find();
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Get all Tasks for a Project
 * GET /tasks/project/:projectId
 */
app.get('/tasks/project/:projectId', authenticateJWT, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Get all Tasks assigned to a specific User
 * GET /tasks/user/:assignedUser
 */
app.get('/tasks/user/:assignedUser', authenticateJWT, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedUser: req.params.assignedUser });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. Get Task by ID
 * GET /tasks/:id
 */
app.get('/tasks/:id', authenticateJWT, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(200).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Change Task Status (Managers & Members)
 * PATCH /tasks/:id/status
 */
app.patch('/tasks/:id/status', authenticateJWT, authorizeRoles('manager', 'member'), async (req, res) => {
  const { status } = req.body;

  if (!status || !['todo', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: todo, in_progress, done' });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const oldStatus = task.status;
    task.status = status;
    const updatedTask = await task.save();

    // RabbitMQ: Publish asynchronous event on status change
    const eventPayload = {
      taskId: task._id.toString(),
      taskTitle: task.title,
      projectId: task.projectId,
      oldStatus,
      newStatus: status,
      changedBy: req.user.email || 'unknown',
      timestamp: new Date()
    };

    publishEvent('task.status_changed', eventPayload);

    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. Update Task Details (Only Managers)
 * PUT /tasks/:id
 */
app.put('/tasks/:id', authenticateJWT, authorizeRoles('manager'), async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 8. Delete a Task (Only Managers)
 * DELETE /tasks/:id
 */
app.delete('/tasks/:id', authenticateJWT, authorizeRoles('manager'), async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Task Service running on port ${PORT}`);
});
