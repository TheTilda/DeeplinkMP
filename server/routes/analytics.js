const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/analytics — overall stats
router.get('/', (req, res) => {
  const { period = '30' } = req.query;

  const totalLinks  = db.prepare('SELECT COUNT(*) as v FROM links').get().v;
  const totalClicks = db.prepare("SELECT COUNT(*) as v FROM clicks WHERE is_bot = 0 OR is_bot IS NULL").get().v;
  const totalUnique = db.prepare("SELECT SUM(is_unique) as v FROM clicks WHERE is_bot = 0 OR is_bot IS NULL").get().v || 0;

  const clicksByMarketplace = db.prepare(`
    SELECT l.marketplace, COUNT(c.id) as clicks, SUM(c.is_unique) as unique_clicks
    FROM links l LEFT JOIN clicks c ON c.link_id = l.id AND (c.is_bot = 0 OR c.is_bot IS NULL)
    GROUP BY l.marketplace
  `).all();

  const clicksByDay = db.prepare(`
    SELECT date(timestamp) as day, COUNT(*) as count, SUM(is_unique) as unique_count
    FROM clicks
    WHERE (is_bot = 0 OR is_bot IS NULL)
      AND timestamp >= datetime('now', '-${Number(period)} days')
    GROUP BY day ORDER BY day
  `).all();

  const clicksByPlatform = db.prepare(`
    SELECT platform, COUNT(*) as count
    FROM clicks WHERE is_bot = 0 OR is_bot IS NULL
    GROUP BY platform ORDER BY count DESC
  `).all();

  const clicksByCountry = db.prepare(`
    SELECT country, country_code, COUNT(*) as count
    FROM clicks WHERE (is_bot = 0 OR is_bot IS NULL) AND country != 'Unknown'
    GROUP BY country_code ORDER BY count DESC LIMIT 10
  `).all();

  const clicksByBrowser = db.prepare(`
    SELECT browser, COUNT(*) as count
    FROM clicks WHERE is_bot = 0 OR is_bot IS NULL
    GROUP BY browser ORDER BY count DESC LIMIT 8
  `).all();

  const topLinks = db.prepare(`
    SELECT l.*, COUNT(c.id) as clicks, SUM(c.is_unique) as unique_clicks
    FROM links l LEFT JOIN clicks c ON c.link_id = l.id AND (c.is_bot = 0 OR c.is_bot IS NULL)
    GROUP BY l.id ORDER BY clicks DESC LIMIT 10
  `).all();

  res.json({
    totalLinks,
    totalClicks,
    totalUnique,
    clicksByMarketplace,
    clicksByDay,
    clicksByPlatform,
    clicksByCountry,
    clicksByBrowser,
    topLinks,
  });
});

module.exports = router;
