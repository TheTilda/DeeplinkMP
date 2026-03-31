const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');

const router = express.Router();

// GET /api/multilinks
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM multi_links ORDER BY created_at DESC
  `).all();
  res.json(rows);
});

// POST /api/multilinks
router.post('/', (req, res) => {
  const { name, wb_url, ozon_url, ym_url } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!wb_url && !ozon_url && !ym_url) {
    return res.status(400).json({ error: 'At least one marketplace URL is required' });
  }

  const id = nanoid(10);
  const short_code = nanoid(6);

  db.prepare(`
    INSERT INTO multi_links (id, name, short_code, wb_url, ozon_url, ym_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, short_code, wb_url || null, ozon_url || null, ym_url || null);

  res.status(201).json(db.prepare('SELECT * FROM multi_links WHERE id = ?').get(id));
});

// DELETE /api/multilinks/:id
router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM multi_links WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
