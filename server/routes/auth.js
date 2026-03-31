const express = require('express');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const SESSION_DAYS = 30;

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key.toString('hex'));
    });
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Логин должен быть не менее 3 символов' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashPassword(password, salt);
  const id = nanoid(10);

  db.prepare('INSERT INTO users (id, username, password_hash, email, role, status) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, username, `${salt}:${hash}`, email || null, 'user', 'pending'
  );

  res.status(201).json({ message: 'Заявка отправлена. Ожидайте подтверждения администратора.' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  // hash is stored as "salt:hash"
  const [salt, storedHash] = user.password_hash.split(':');
  const hash = await hashPassword(password, salt);

  if (hash !== storedHash) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  if (user.status === 'pending') {
    return res.status(403).json({ error: 'Аккаунт ожидает подтверждения администратора' });
  }
  if (user.status === 'rejected') {
    return res.status(403).json({ error: 'Аккаунт отклонён администратором' });
  }

  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt);

  // cleanup old sessions for this user
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < datetime('now')").run(user.id);

  res.json({ token, username: user.username, role: user.role, expires_at: expiresAt });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers['authorization'].slice(7);
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const [salt, storedHash] = user.password_hash.split(':');
  const currentHash = await hashPassword(current_password, salt);

  if (currentHash !== storedHash) {
    return res.status(401).json({ error: 'Текущий пароль неверный' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = await hashPassword(new_password, newSalt);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(`${newSalt}:${newHash}`, user.id);

  // Invalidate all other sessions
  const token = req.headers['authorization'].slice(7);
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(user.id, token);

  res.json({ success: true });
});

module.exports = { router, hashPassword };
