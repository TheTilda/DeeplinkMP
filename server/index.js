require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { nanoid } = require('nanoid');

const { router: linksRouter } = require('./routes/links');
const analyticsRouter = require('./routes/analytics');
const redirectRouter = require('./routes/redirect');
const { router: authRouter, hashPassword } = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api/links', requireAuth, linksRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);

// Health check (public)
app.get('/api/health', (_req, res) => res.json({ status: 'ok', baseUrl: BASE_URL }));

// Redirect short codes — PUBLIC (tracking works without login)
app.use('/r', redirectRouter);

// Serve frontend
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.get(/^\/(?!api|r).*/, (_req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(200).send('DeepLinker API running. Frontend not built yet.');
  });
});

// --- Initial admin setup ---
async function ensureAdminUser() {
  const existing = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (existing) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(8).toString('hex');

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashPassword(password, salt);
  const id = nanoid(10);

  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, username, `${salt}:${hash}`);

  if (!process.env.ADMIN_PASSWORD) {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║        ADMIN ACCOUNT CREATED             ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Login:    ${username.padEnd(30)} ║`);
    console.log(`║  Password: ${password.padEnd(30)} ║`);
    console.log('║                                          ║');
    console.log('║  ⚠️  Save this password — shown once!    ║');
    console.log('╚══════════════════════════════════════════╝\n');
  }
}

ensureAdminUser().then(() => {
  app.listen(PORT, () => {
    console.log(`DeepLinker server running at ${BASE_URL}`);
    console.log(`Short links: ${BASE_URL}/r/:code`);
    console.log(`API: ${BASE_URL}/api`);
  });
});
