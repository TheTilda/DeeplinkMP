const crypto = require('crypto');
const db = require('../db');

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Legacy env-var static token (backwards compat)
  const serviceToken = process.env.API_TOKEN || process.env.DEEPLINK_API_TOKEN;
  if (serviceToken && token === serviceToken) {
    req.user = { id: 'api-token', username: 'api-token', role: 'admin' };
    return next();
  }

  // DB-managed API tokens (dlk_...)
  if (token.startsWith('dlk_')) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const apiToken = db.prepare('SELECT * FROM api_tokens WHERE token_hash = ?').get(hash);
    if (apiToken) {
      db.prepare("UPDATE api_tokens SET last_used_at = datetime('now') WHERE id = ?").run(apiToken.id);
      req.user = { id: 'api:' + apiToken.id, username: apiToken.name, role: 'admin' };
      return next();
    }
    return res.status(401).json({ error: 'Invalid or revoked API token' });
  }

  // Session token
  const session = db.prepare(`
    SELECT s.*, u.username, u.role, u.status FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = { id: session.user_id, username: session.username, role: session.role };
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
