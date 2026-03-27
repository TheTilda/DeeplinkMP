const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');

const router = express.Router();

const MARKETPLACES = {
  wb: {
    name: 'Wildberries',
    buildUrl: (id) => `https://www.wildberries.ru/catalog/${id}/detail.aspx`,
    appScheme: { ios: 'wildberries://product?id=', android: 'wildberries://product?id=' },
    color: '#CB11AB',
  },
  ozon: {
    name: 'Ozon',
    buildUrl: (id) => `https://www.ozon.ru/product/${id}/`,
    appScheme: { ios: 'ozon://product/', android: 'ozon://product/' },
    color: '#005BFF',
  },
  ym: {
    name: 'Яндекс Маркет',
    buildUrl: (id) => `https://market.yandex.ru/product/${id}`,
    appScheme: { ios: 'yamarket://product?id=', android: 'yamarket://product?id=' },
    color: '#FC3F1D',
  },
};

function buildFinalUrl(baseUrl, utm) {
  const url = new URL(baseUrl);
  if (utm.source)   url.searchParams.set('utm_source',   utm.source);
  if (utm.medium)   url.searchParams.set('utm_medium',   utm.medium);
  if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign);
  if (utm.content)  url.searchParams.set('utm_content',  utm.content);
  if (utm.term)     url.searchParams.set('utm_term',     utm.term);
  return url.toString();
}

// GET /api/links
router.get('/', (req, res) => {
  const links = db.prepare(`
    SELECT l.*,
      COUNT(c.id)                                             AS clicks_total,
      SUM(CASE WHEN c.is_unique = 1 THEN 1 ELSE 0 END)       AS clicks_unique,
      SUM(CASE WHEN c.platform = 'ios'     THEN 1 ELSE 0 END) AS clicks_ios,
      SUM(CASE WHEN c.platform = 'android' THEN 1 ELSE 0 END) AS clicks_android,
      SUM(CASE WHEN c.platform = 'desktop' THEN 1 ELSE 0 END) AS clicks_desktop
    FROM links l
    LEFT JOIN clicks c ON c.link_id = l.id AND (c.is_bot = 0 OR c.is_bot IS NULL)
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `).all();
  res.json(links);
});

// GET /api/links/:id
router.get('/:id', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  res.json(link);
});

// POST /api/links
router.post('/', (req, res) => {
  const { name, marketplace, product_id, custom_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;
  if (!name || !marketplace) return res.status(400).json({ error: 'name and marketplace are required' });

  const mp = MARKETPLACES[marketplace];
  if (!mp) return res.status(400).json({ error: `Unknown marketplace. Allowed: ${Object.keys(MARKETPLACES).join(', ')}` });

  let baseUrl;
  if (custom_url)    baseUrl = custom_url;
  else if (product_id) baseUrl = mp.buildUrl(product_id);
  else return res.status(400).json({ error: 'product_id or custom_url is required' });

  const finalUrl = buildFinalUrl(baseUrl, {
    source: utm_source, medium: utm_medium, campaign: utm_campaign,
    content: utm_content, term: utm_term,
  });

  const id         = nanoid(10);
  const short_code = nanoid(6);

  db.prepare(`
    INSERT INTO links (id, name, marketplace, original_url, short_code,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term)
    VALUES (?,?,?,?,?, ?,?,?,?,?)
  `).run(id, name, marketplace, finalUrl, short_code,
    utm_source || null, utm_medium || null, utm_campaign || null, utm_content || null, utm_term || null);

  res.status(201).json(db.prepare('SELECT * FROM links WHERE id = ?').get(id));
});

// DELETE /api/links/:id
router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Link not found' });
  res.json({ success: true });
});

// GET /api/links/:id/analytics  — full detail
router.get('/:id/analytics', (req, res) => {
  const { period = '30' } = req.query; // days
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const filter = `link_id = ? AND (is_bot = 0 OR is_bot IS NULL)`;
  const args   = [req.params.id];

  const total        = db.prepare(`SELECT COUNT(*) as v FROM clicks WHERE ${filter}`).get(...args).v;
  const totalUnique  = db.prepare(`SELECT SUM(is_unique) as v FROM clicks WHERE ${filter}`).get(...args).v || 0;

  const byPlatform = db.prepare(`
    SELECT platform, COUNT(*) as count, SUM(is_unique) as unique_count
    FROM clicks WHERE ${filter} GROUP BY platform ORDER BY count DESC
  `).all(...args);

  // Group by os only (ignore version to avoid duplicates)
  const byOs = db.prepare(`
    SELECT COALESCE(os, 'Unknown') as os, COUNT(*) as count
    FROM clicks WHERE ${filter}
    GROUP BY COALESCE(os, 'Unknown') ORDER BY count DESC LIMIT 10
  `).all(...args);

  // Group by browser only
  const byBrowser = db.prepare(`
    SELECT COALESCE(browser, 'Unknown') as browser, COUNT(*) as count
    FROM clicks WHERE ${filter}
    GROUP BY COALESCE(browser, 'Unknown') ORDER BY count DESC LIMIT 10
  `).all(...args);

  // Derive device type from platform (more reliable than ua-parser device_type)
  const byDeviceType = db.prepare(`
    SELECT
      CASE
        WHEN platform IN ('ios','android') THEN 'mobile'
        ELSE 'desktop'
      END as device_type,
      COUNT(*) as count
    FROM clicks WHERE ${filter}
    GROUP BY device_type ORDER BY count DESC
  `).all(...args);

  // Merge NULL/Unknown countries into single group
  const byCountry = db.prepare(`
    SELECT
      CASE WHEN country IS NULL OR country = 'Unknown' THEN 'Неизвестно' ELSE country END as country,
      CASE WHEN country_code IS NULL OR country_code = '' THEN '' ELSE country_code END as country_code,
      COUNT(*) as count
    FROM clicks WHERE ${filter}
    GROUP BY country_code ORDER BY count DESC LIMIT 20
  `).all(...args);

  const byCity = db.prepare(`
    SELECT city, country, COUNT(*) as count
    FROM clicks WHERE ${filter} AND city IS NOT NULL AND city != ''
    GROUP BY city ORDER BY count DESC LIMIT 10
  `).all(...args);

  // Merge NULL and 'direct' into single group
  const byReferer = db.prepare(`
    SELECT COALESCE(referer_domain, 'direct') as referer_domain, COUNT(*) as count
    FROM clicks WHERE ${filter}
    GROUP BY COALESCE(referer_domain, 'direct') ORDER BY count DESC LIMIT 15
  `).all(...args);

  // Clicks by day (last N days)
  const byDay = db.prepare(`
    SELECT date(timestamp) as day, COUNT(*) as count, SUM(is_unique) as unique_count
    FROM clicks WHERE ${filter}
      AND timestamp >= datetime('now', '-${Number(period)} days')
    GROUP BY day ORDER BY day
  `).all(...args);

  // Clicks by hour of day (0-23)
  const byHour = db.prepare(`
    SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as count
    FROM clicks WHERE ${filter} GROUP BY hour ORDER BY hour
  `).all(...args);

  // Clicks by weekday (0=Sun … 6=Sat)
  const byWeekday = db.prepare(`
    SELECT CAST(strftime('%w', timestamp) AS INTEGER) as weekday, COUNT(*) as count
    FROM clicks WHERE ${filter} GROUP BY weekday ORDER BY weekday
  `).all(...args);

  res.json({
    link,
    total,
    totalUnique,
    byPlatform,
    byOs,
    byBrowser,
    byDeviceType,
    byCountry,
    byCity,
    byReferer,
    byDay,
    byHour,
    byWeekday,
  });
});

module.exports = { router, MARKETPLACES };
