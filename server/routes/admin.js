const express = require('express');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const db = require('../db');
const { hashPassword } = require('./auth');

const router = express.Router();

// ── API Token management ─────────────────────────────────────────────────────

// GET /api/admin/tokens
router.get('/tokens', (req, res) => {
  const tokens = db.prepare(`
    SELECT id, name, token_prefix, created_by, last_used_at, created_at
    FROM api_tokens ORDER BY created_at DESC
  `).all();
  res.json(tokens);
});

// POST /api/admin/tokens
router.post('/tokens', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  const rawToken = 'dlk_' + crypto.randomBytes(24).toString('hex'); // dlk_ + 48 hex = 52 chars
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const prefix = rawToken.slice(0, 12); // "dlk_XXXXXXXX"
  const id = nanoid(10);

  db.prepare(
    'INSERT INTO api_tokens (id, name, token_hash, token_prefix, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name.trim(), hash, prefix, req.user.id);

  // Return the plaintext token ONCE — never stored again
  res.status(201).json({ id, name: name.trim(), token: rawToken, token_prefix: prefix, created_at: new Date().toISOString() });
});

// DELETE /api/admin/tokens/:id
router.delete('/tokens/:id', (req, res) => {
  const r = db.prepare('DELETE FROM api_tokens WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Token not found' });
  res.json({ success: true });
});

// ── Global settings ──────────────────────────────────────────────────────────

// PUT /api/admin/settings
router.put('/settings', (req, res) => {
  const allowed = ['ozon_utm_campaign'];
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  for (const key of allowed) {
    if (key in req.body) {
      const val = req.body[key] ? String(req.body[key]).trim() : null;
      stmt.run(key, val);
    }
  }
  res.json({ success: true });
});

// ── User management ──────────────────────────────────────────────────────────

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
