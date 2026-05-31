require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/teamtask';

mongoose.set('strictQuery', false);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['manager', 'member'], default: 'member' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function runMigration() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Auth Service MongoDB connecté');

    const existingUser = await User.findOne({ email: 'manager@test.com' });
    if (!existingUser) {
      const passwordHash = bcrypt.hashSync('password123', 10);
      await User.create({
        email: 'manager@test.com',
        password: passwordHash,
        role: 'manager'
      });
      console.log('✅ Utilisateur manager créé : manager@test.com / password123');
    } else {
      console.log('✅ Utilisateur manager déjà présent');
    }

    await User.init();
    console.log('✅ Migration Auth Service terminée');
  } catch (error) {
    console.error('❌ Migration Auth Service échouée :', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
