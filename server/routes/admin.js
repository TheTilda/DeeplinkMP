const express = require('express');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const db = require('../db');
const { hashPassword } = require('./auth');

const router = express.Router();

// POST /api/admin/users — create user
router.post('/users', async (req, res) => {
  const { username, password, email, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashPassword(password, salt);
  const id = nanoid(10);

  db.prepare('INSERT INTO users (id, username, password_hash, email, role, status) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, username, `${salt}:${hash}`, email || null, role === 'admin' ? 'admin' : 'user', 'approved'
  );

  res.status(201).json(db.prepare('SELECT id, username, email, role, status, created_at FROM users WHERE id = ?').get(id));
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, role, status, created_at FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

// POST /api/admin/users/:id/approve
router.post('/users/:id/approve', (req, res) => {
  const r = db.prepare("UPDATE users SET status = 'approved' WHERE id = ? AND role != 'admin'").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true });
});

// POST /api/admin/users/:id/reject
router.post('/users/:id/reject', (req, res) => {
  const r = db.prepare("UPDATE users SET status = 'rejected' WHERE id = ? AND role != 'admin'").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'User not found' });
  // Invalidate all sessions for this user
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.params.id);
  res.json({ success: true });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  const r = db.prepare("DELETE FROM users WHERE id = ? AND role != 'admin'").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'User not found or cannot delete admin' });
  res.json({ success: true });
});

module.exports = router;
