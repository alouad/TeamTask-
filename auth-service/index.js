require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_in_production';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/teamtask';

app.use(express.json());
app.use(cors());

mongoose.set('strictQuery', false);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['manager', 'member'], default: 'member' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

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

app.post('/register', async (req, res) => {
  const { email, password, role = 'member' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Utilisateur déjà existant' });
    }

    const newUser = new User({
      email,
      password: bcrypt.hashSync(password, 10),
      role: ['manager', 'member'].includes(role) ? role : 'member'
    });

    await newUser.save();

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: { id: newUser._id, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Authentification réussie',
      token,
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

app.get('/verify', authenticateToken, (req, res) => {
  res.status(200).json({
    message: 'Token valide',
    user: req.user
  });
});

app.get('/', async (req, res) => {
  const users = await User.find({}, { email: 1, role: 1 });
  res.json({
    service: 'Auth Service',
    version: '1.0.0',
    status: 'running',
    users: users
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Auth Service connecté à MongoDB');

    app.listen(PORT, () => {
      console.log(`✅ Auth Service démarré sur http://localhost:${PORT}`);
      console.log(`JWT Secret: ${JWT_SECRET}`);
    });
  } catch (error) {
    console.error('❌ Impossible de se connecter à MongoDB:', error.message);
    process.exit(1);
  }
};

startServer();
