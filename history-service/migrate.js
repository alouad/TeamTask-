require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/teamtask';

mongoose.set('strictQuery', false);

const historySchema = new mongoose.Schema({
  type: { type: String, required: true },
  taskId: { type: Number, required: true },
  projectId: { type: Number },
  titre: { type: String },
  assigneA: { type: String },
  ancienStatut: { type: String },
  nouveauStatut: { type: String },
  utilisateur: { type: String },
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const History = mongoose.model('History', historySchema);

async function runMigration() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ History Service MongoDB connecté');
    await History.init();
    console.log('✅ Migration History Service terminée');
  } catch (error) {
    console.error('❌ Migration History Service échouée :', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
