require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/teamtask';

mongoose.set('strictQuery', false);

const taskSchema = new mongoose.Schema({
  projectId: { type: Number, required: true },
  titre: { type: String, required: true },
  assigneA: { type: String, required: true },
  statut: { type: String, default: 'à faire' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date }
});

const Task = mongoose.model('Task', taskSchema);

async function runMigration() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Task Service MongoDB connecté');
    await Task.init();
    console.log('✅ Migration Task Service terminée');
  } catch (error) {
    console.error('❌ Migration Task Service échouée :', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
