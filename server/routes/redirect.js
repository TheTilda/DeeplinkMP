const express = require('express');
const crypto  = require('crypto');
const UAParser = require('ua-parser-js');
const geoip   = require('geoip-lite');
const db      = require('../db');
const { MARKETPLACES } = require('./links');

const router = express.Router();

// Known bots / crawlers
const BOT_RE = /bot|crawler|spider|facebookexternalhit|WhatsApp|Telegram|Slackbot|Twitterbot|LinkedInBot|vk\.com\/dev|Discordbot|preview|prerender|headless|python-requests|curl|wget|axios|Go-http/i;

function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

function getRealIp(ip) {
  // Strip IPv6-mapped IPv4
  return ip.replace(/^::ffff:/, '');
}

function getRefererDomain(referer) {
  if (!referer) return 'direct';
  try {
    const url = new URL(referer);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function buildRedirectPage(appUrl, webUrl, mp) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Открываем ${mp.name}...</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f8fc;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .card{background:#fff;border-radius:20px;padding:40px 32px;max-width:360px;width:100%;text-align:center;box-shadow:0 4px 32px rgba(0,0,0,0.08),0 0 0 1px rgba(0,0,0,0.04)}
    .icon{width:64px;height:64px;border-radius:18px;background:${mp.color};margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:30px}
    h2{font-size:18px;font-weight:700;color:#111;margin-bottom:8px}
    p{font-size:13px;color:#888;margin-bottom:28px;line-height:1.6}
    .btn-app{display:block;width:100%;padding:14px;background:${mp.color};color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:600;text-decoration:none;margin-bottom:10px;cursor:pointer}
    .btn-web{display:block;width:100%;padding:13px;background:transparent;color:#888;border:1.5px solid #e8e8e8;border-radius:14px;font-size:14px;text-decoration:none}
    .spin{width:18px;height:18px;border:2px solid rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:s .7s linear infinite;margin-right:8px;vertical-align:middle}
    @keyframes s{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🛍️</div>
    <h2>Открываем ${mp.name}</h2>
    <p>Переходим в приложение. Если оно не открылось — используйте кнопку ниже.</p>
    <a href="${appUrl}" class="btn-app"><span class="spin"></span>Открыть в приложении</a>
    <a href="${webUrl}" class="btn-web">Открыть в браузере</a>
  </div>
  <script>
    setTimeout(function(){ window.location.href='${appUrl}'; }, 350);
  <\/script>
</body>
</html>`;
}

router.get('/:code', (req, res) => {
  const link = db.prepare('SELECT * FROM links WHERE short_code = ?').get(req.params.code);
  if (!link) return res.status(404).send('Link not found');

  const ua       = req.headers['user-agent'] || '';
  const rawIp    = getIp(req);
  const ip       = getRealIp(rawIp);
  const referer  = req.headers['referer'] || req.headers['referrer'] || '';
  const isBot    = BOT_RE.test(ua) ? 1 : 0;

  // Parse UA
  const parser  = new UAParser(ua);
  const osInfo  = parser.getOS();
  const brInfo  = parser.getBrowser();
  const devInfo = parser.getDevice();

  const os             = osInfo.name   || 'Unknown';
  const os_version     = osInfo.version || '';
  const browser        = brInfo.name   || 'Unknown';
  const browser_version = brInfo.version || '';
  const device_type    = devInfo.type   || 'desktop'; // mobile | tablet | desktop

  let platform = 'desktop';
  if (/ios|iphone os/i.test(os))    platform = 'ios';
  else if (/android/i.test(os))     platform = 'android';
  else if (device_type === 'mobile') platform = 'android'; // fallback

  // Geo
  const geo          = geoip.lookup(ip) || {};
  const country      = geo.country ? countryName(geo.country) : 'Unknown';
  const country_code = geo.country || '';
  const city         = geo.city || '';

  // Referer
  const referer_domain = getRefererDomain(referer);

  // Unique detection: hash of (link_id + ip + ua + day)
  const day          = new Date().toISOString().slice(0, 10);
  const unique_hash  = crypto.createHash('sha256')
    .update(`${link.id}:${ip}:${ua}:${day}`)
    .digest('hex');

  const existing = db.prepare('SELECT id FROM clicks WHERE unique_hash = ?').get(unique_hash);
  const is_unique = existing ? 0 : 1;

  db.prepare(`
    INSERT INTO clicks (
      link_id, user_agent,
      platform, os, os_version, browser, browser_version, device_type,
      ip, country, country_code, city,
      referer, referer_domain,
      unique_hash, is_unique, is_bot
    ) VALUES (?,?, ?,?,?,?,?,?, ?,?,?,?, ?,?, ?,?,?)
  `).run(
    link.id, ua,
    platform, os, os_version, browser, browser_version, device_type,
    ip, country, country_code, city,
    referer, referer_domain,
    unique_hash, is_unique, isBot
  );

  // App deeplink
  const mp = MARKETPLACES[link.marketplace];
  if ((platform === 'ios' || platform === 'android') && mp) {
    const webUrl = link.original_url;
    let appUrl = null;

    if (link.marketplace === 'wb') {
      const m = link.original_url.match(/\/catalog\/(\d+)\//);
      if (m) {
        if (platform === 'android') {
          // App Links: Android opens WB app and handles the URL → correct product page
          appUrl = `intent://www.wildberries.ru/catalog/${m[1]}/detail.aspx#Intent;scheme=https;package=com.wildberries.ru;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
        } else {
          // iOS: redirect to web URL — Safari Universal Links open WB app at correct product
          appUrl = webUrl;
        }
      }
    } else if (link.marketplace === 'ozon') {
      const m = link.original_url.match(/\/product\/([^/?#]+)/);
      if (m) {
        if (platform === 'android') {
          appUrl = `intent://www.ozon.ru/product/${m[1]}#Intent;scheme=https;package=ru.ozon.app.android;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
        } else {
          appUrl = webUrl;
        }
      }
    } else if (link.marketplace === 'ym') {
      const m = link.original_url.match(/\/product\/(\d+)/);
      if (m) {
        if (platform === 'android') {
          appUrl = `intent://market.yandex.ru/product/${m[1]}#Intent;scheme=https;package=ru.yandex.market;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
        } else {
          appUrl = webUrl;
        }
      }
    }

    if (appUrl) return res.send(buildRedirectPage(appUrl, webUrl, mp));
  }

  res.redirect(302, link.original_url);
});

// ISO 3166-1 alpha-2 → Russian country name
const COUNTRIES = {
  RU:'Россия',BY:'Беларусь',KZ:'Казахстан',UA:'Украина',UZ:'Узбекистан',
  KG:'Кыргызстан',TJ:'Таджикистан',AM:'Армения',AZ:'Азербайджан',GE:'Грузия',
  MD:'Молдова',TM:'Туркменистан',LT:'Литва',LV:'Латвия',EE:'Эстония',
  DE:'Германия',FR:'Франция',GB:'Великобритания',US:'США',CN:'Китай',
  TR:'Турция',IL:'Израиль',AE:'ОАЭ',PL:'Польша',CZ:'Чехия',FI:'Финляндия',
  SE:'Швеция',NO:'Норвегия',DK:'Дания',NL:'Нидерланды',IT:'Италия',ES:'Испания',
  PT:'Португалия',CH:'Швейцария',AT:'Австрия',HU:'Венгрия',RO:'Румыния',
  BG:'Болгария',RS:'Сербия',HR:'Хорватия',SK:'Словакия',SI:'Словения',
  MK:'Северная Македония',BA:'Босния и Герцеговина',ME:'Черногория',AL:'Албания',
  GR:'Греция',CY:'Кипр',MT:'Мальта',JP:'Япония',KR:'Южная Корея',IN:'Индия',
  BR:'Бразилия',CA:'Канада',AU:'Австралия',MX:'Мексика',AR:'Аргентина',
};

function countryName(code) {
  return COUNTRIES[code] || code;
}

module.exports = router;
