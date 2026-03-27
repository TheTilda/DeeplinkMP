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

  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt);

  // cleanup old sessions for this user
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < datetime('now')").run(user.id);

  res.json({ token, username: user.username, expires_at: expiresAt });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers['authorization'].slice(7);
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
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
