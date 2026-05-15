const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const db      = require('../db');

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/admin/wb-report  — upload & parse xlsx
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не передан' });

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch {
    return res.status(400).json({ error: 'Не удалось прочитать файл. Убедитесь, что это xlsx.' });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) return res.status(400).json({ error: 'Файл пустой или не содержит данных' });

  // Validate expected columns
  const sample = rows[0];
  const required = ['Дата', 'utm_campaign', 'Переходы'];
  const missing = required.filter((k) => !(k in sample));
  if (missing.length) {
    return res.status(400).json({ error: `Отсутствуют колонки: ${missing.join(', ')}` });
  }

  // Clear existing data for the dates present in the file, then insert fresh
  const dates = [...new Set(rows.map((r) => String(r['Дата']).trim()).filter(Boolean))];
  const delStmt = db.prepare('DELETE FROM wb_report_rows WHERE date = ?');
  for (const d of dates) delStmt.run(d);

  const ins = db.prepare(`
    INSERT INTO wb_report_rows
      (date, utm_source, utm_medium, utm_campaign, utm_term, utm_content, clicks, orders, revenue, platform)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  for (const r of rows) {
    const date     = String(r['Дата'] || '').trim();
    const campaign = String(r['utm_campaign'] || '').trim();
    if (!date || !campaign) continue;

    ins.run(
      date,
      String(r['utm_source']  || '').trim() || null,
      String(r['utm_medium']  || '').trim() || null,
      campaign,
      String(r['utm_term']    || '').trim() || null,
      String(r['utm_content'] || '').trim() || null,
      parseInt(r['Переходы']               || 0, 10),
      parseInt(r['Заказанные товары']       || 0, 10),
      parseFloat(String(r['Стоимость заказов (руб)'] || '0').replace(',', '.')) || 0,
      String(r['Платформа']   || '').trim() || null,
    );
    inserted++;
  }

  res.json({ success: true, inserted, dates });
});

// GET /api/admin/wb-report/dates  — list uploaded date ranges
router.get('/dates', (_req, res) => {
  const rows = db.prepare(`
    SELECT date, COUNT(*) as rows, SUM(clicks) as clicks, SUM(orders) as orders,
           MAX(uploaded_at) as uploaded_at
    FROM wb_report_rows GROUP BY date ORDER BY date DESC LIMIT 60
  `).all();
  res.json(rows);
});

// GET /api/links/:id/wb-stats  — per-link WB stats matched by utm_campaign
// (mounted separately in index.js under /api/links/:id/wb-stats)
router.get('/link-stats/:campaign', (req, res) => {
  const campaign = decodeURIComponent(req.params.campaign);

  const summary = db.prepare(`
    SELECT
      SUM(clicks)  as clicks,
      SUM(orders)  as orders,
      SUM(revenue) as revenue,
      MIN(date)    as date_from,
      MAX(date)    as date_to
    FROM wb_report_rows WHERE utm_campaign = ?
  `).get(campaign);

  const byDate = db.prepare(`
    SELECT date, SUM(clicks) as clicks, SUM(orders) as orders, SUM(revenue) as revenue
    FROM wb_report_rows WHERE utm_campaign = ?
    GROUP BY date ORDER BY date DESC LIMIT 60
  `).all(campaign);

  const byPlatform = db.prepare(`
    SELECT platform, SUM(clicks) as clicks, SUM(orders) as orders
    FROM wb_report_rows WHERE utm_campaign = ?
    GROUP BY platform ORDER BY clicks DESC
  `).all(campaign);

  res.json({ campaign, summary, byDate, byPlatform });
});

module.exports = router;
