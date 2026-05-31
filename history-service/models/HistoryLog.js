import mongoose from 'mongoose';

const historyLogSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true
  },
  taskTitle: {
    type: String,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  oldStatus: {
    type: String,
    required: true
  },
  newStatus: {
    type: String,
    required: true
  },
  changedBy: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  loggedAt: {
    type: Date,
    default: Date.now
  }
});

const HistoryLog = mongoose.model('HistoryLog', historyLogSchema);

export default HistoryLog;
