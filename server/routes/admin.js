const express = require('express');
const db = require('../db');

const router = express.Router();

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
