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

// iosAutoRedirect=true  → Ozon/YM: window.location.href triggers Universal Links on iOS
// iosAutoRedirect=false → WB: JS navigation does NOT trigger Universal Links; need native tap
function buildRedirectPage(appUrl, webUrl, mp, marketplace) {
  const iosAutoRedirect = marketplace !== 'wb';
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Открываем ${mp.name}...</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5fa;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .progress{position:fixed;top:0;left:0;height:3px;background:${mp.color};border-radius:0 2px 2px 0;animation:prog 1s ease-out forwards}
    @keyframes prog{from{width:0}to{width:92%}}
    .card{background:#fff;border-radius:24px;padding:40px 28px 32px;max-width:340px;width:100%;text-align:center;box-shadow:0 2px 24px rgba(0,0,0,0.07),0 0 0 1px rgba(0,0,0,0.04)}
    .badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:100px;font-size:12px;font-weight:600;letter-spacing:.02em;margin-bottom:20px;background:${mp.color}18;color:${mp.color}}
    .dot{width:6px;height:6px;border-radius:50%;background:${mp.color};animation:pulse 1.2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
    h2{font-size:19px;font-weight:700;color:#111;margin-bottom:8px;letter-spacing:-.01em}
    p{font-size:13px;color:#999;margin-bottom:28px;line-height:1.55}
    .btn-app{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;background:${mp.color};color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:600;text-decoration:none;margin-bottom:10px;cursor:pointer;transition:opacity .15s}
    .btn-app:active{opacity:.88}
    .btn-web{display:block;width:100%;padding:13px;background:transparent;color:#aaa;border:1.5px solid #ebebeb;border-radius:14px;font-size:14px;text-decoration:none;transition:border-color .15s,color .15s}
    .btn-web:hover{border-color:#ccc;color:#777}
    .spin{width:16px;height:16px;border:2px solid rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:s .65s linear infinite;flex-shrink:0}
    @keyframes s{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="progress"></div>
  <div class="card">
    <div class="badge"><span class="dot"></span>${mp.name}</div>
    <h2>Открываем приложение</h2>
    <p id="hint">Нажмите кнопку, чтобы открыть приложение</p>
    <a href="${appUrl}" class="btn-app" id="btn-app"><span class="spin" id="spin" style="display:none"></span>Открыть в приложении</a>
    <a href="${webUrl}" class="btn-web">Открыть в браузере</a>
  </div>
  <script>
    (function(){
      var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      var iosAutoRedirect = ${iosAutoRedirect};
      var btn = document.getElementById('btn-app');
      var spin = document.getElementById('spin');
      var hint = document.getElementById('hint');

      if (isIOS && iosAutoRedirect) {
        // Ozon / YM on iOS: navigating to their domain triggers Universal Links / smart banner.
        // Must use 350ms delay — Safari blocks JS navigation that fires under ~300ms without gesture.
        // Button stays as plain <a> (no e.preventDefault) so native tap also works.
        hint.textContent = 'Переход в приложение...';
        spin.style.display = 'inline-block';
        setTimeout(function(){ window.location.href = '${appUrl}'; }, 350);
      } else if (isIOS) {
        // WB on iOS: JS navigation does NOT open the WB app — only native anchor tap does.
        hint.textContent = 'Нажмите кнопку — откроется приложение';
      } else {
        // Android: intent:// works reliably via window.location.href.
        hint.textContent = 'Переход в приложение...';
        spin.style.display = 'inline-block';
        btn.addEventListener('click', function(e){
          e.preventDefault();
          window.location.href = '${appUrl}';
        });
        setTimeout(function(){ window.location.href = '${appUrl}'; }, 100);
      }
    })();
  <\/script>
</body>
</html>`;
}

function buildMultiSelectPage(multiLink, code) {
  const MP_META = {
    wb:   { name: 'Wildberries', color: '#CB11AB', short: 'WB' },
    ozon: { name: 'Ozon',        color: '#005BFF', short: 'OZ' },
    ym:   { name: 'Яндекс Маркет', color: '#FC3F1D', short: 'ЯМ' },
  };

  const available = [
    multiLink.wb_url   && { id: 'wb',   url: multiLink.wb_url },
    multiLink.ozon_url && { id: 'ozon', url: multiLink.ozon_url },
    multiLink.ym_url   && { id: 'ym',   url: multiLink.ym_url },
  ].filter(Boolean);

  const buttons = available.map(({ id }) => {
    const m = MP_META[id];
    return `<a href="/r/${code}?mp=${id}" class="btn-mp" style="--c:${m.color}">
      <span class="mp-icon" style="background:${m.color}18;color:${m.color}">${m.short}</span>
      <span class="mp-name">${m.name}</span>
      <svg class="mp-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 10h6M10 7l3 3-3 3"/></svg>
    </a>`;
  }).join('');

  const escapedName = multiLink.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Выберите маркетплейс — ${escapedName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5fa;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .card{background:#fff;border-radius:24px;padding:32px 24px;max-width:340px;width:100%;box-shadow:0 2px 24px rgba(0,0,0,0.07),0 0 0 1px rgba(0,0,0,0.04)}
    .header{text-align:center;margin-bottom:24px}
    .eyebrow{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#bbb;margin-bottom:8px}
    h2{font-size:17px;font-weight:700;color:#111;line-height:1.3;letter-spacing:-.01em}
    .buttons{display:flex;flex-direction:column;gap:8px}
    .btn-mp{display:flex;align-items:center;gap:12px;width:100%;padding:13px 14px;background:#fafafa;border:1.5px solid #eee;border-radius:14px;text-decoration:none;transition:background .12s,border-color .12s,transform .1s;cursor:pointer}
    .btn-mp:hover{background:#f3f3f9;border-color:#ddd;transform:translateY(-1px)}
    .btn-mp:active{transform:translateY(0)}
    .mp-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;letter-spacing:.01em}
    .mp-name{flex:1;font-size:15px;font-weight:600;color:#111;text-align:left}
    .mp-arrow{width:18px;height:18px;color:#ccc;flex-shrink:0}
    .footer{text-align:center;margin-top:18px;font-size:11px;color:#ccc}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="eyebrow">Выберите маркетплейс</div>
      <h2>${escapedName}</h2>
    </div>
    <div class="buttons">${buttons}</div>
  </div>
  <div class="footer">DeepLinker</div>
</body>
</html>`;
}

router.get('/:code', (req, res) => {
  // Check multi_links first
  const multiLink = db.prepare('SELECT * FROM multi_links WHERE short_code = ?').get(req.params.code);
  if (multiLink) {
    const mp = req.query.mp;
    const urlMap = { wb: multiLink.wb_url, ozon: multiLink.ozon_url, ym: multiLink.ym_url };

    if (mp && urlMap[mp]) {
      // Redirect to the chosen marketplace using deeplink logic
      const ua = req.headers['user-agent'] || '';
      const parser = new UAParser(ua);
      const osInfo = parser.getOS();
      const os = osInfo.name || 'Unknown';
      let platform = 'desktop';
      if (/ios|iphone os/i.test(os)) platform = 'ios';
      else if (/android/i.test(os)) platform = 'android';

      const webUrl = urlMap[mp];
      const mpMeta = { wb: { name: 'Wildberries', color: '#CB11AB' }, ozon: { name: 'Ozon', color: '#005BFF' }, ym: { name: 'Яндекс Маркет', color: '#FC3F1D' } };
      const mpObj = mpMeta[mp];

      if (platform === 'desktop') return res.redirect(302, webUrl);

      let appUrl = null;
      if (mp === 'wb') {
        const m = webUrl.match(/\/catalog\/(\d+)\//);
        if (m) {
          appUrl = platform === 'android'
            ? `intent://www.wildberries.ru/catalog/${m[1]}/detail.aspx#Intent;scheme=https;package=com.wildberries.ru;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`
            : webUrl;
        }
      } else if (mp === 'ozon') {
        const m = webUrl.match(/\/product\/([^/?#]+)/);
        if (m) {
          appUrl = platform === 'android'
            ? `intent://www.ozon.ru/product/${m[1]}#Intent;scheme=https;package=ru.ozon.app.android;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`
            : webUrl;
        }
      } else if (mp === 'ym') {
        const m = webUrl.match(/\/product\/(\d+)/);
        if (m) {
          appUrl = platform === 'android'
            ? `intent://market.yandex.ru/product/${m[1]}#Intent;scheme=https;package=ru.yandex.market;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`
            : webUrl;
        }
      }

      return res.send(buildRedirectPage(appUrl || webUrl, webUrl, mpObj, mp));
    }

    // No mp chosen — show selection page
    return res.send(buildMultiSelectPage(multiLink, req.params.code));
  }

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

    if (appUrl) return res.send(buildRedirectPage(appUrl, webUrl, mp, link.marketplace));
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
