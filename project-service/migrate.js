require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/teamtask';

mongoose.set('strictQuery', false);

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  endDate: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);

async function runMigration() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Project Service MongoDB connecté');

    const count = await Project.countDocuments();
    if (count === 0) {
      await Project.create({
        name: 'Site Web Startup',
        description: 'Création du site web officiel',
        endDate: '2025-06-01',
        createdBy: 'manager@test.com'
      });
      console.log('✅ Projet initial créé');
    } else {
      console.log(`✅ ${count} projet(s) existant(s) trouvés`);
    }

    await Project.init();
    console.log('✅ Migration Project Service terminée');
  } catch (error) {
    console.error('❌ Migration Project Service échouée :', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
