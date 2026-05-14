 ---
  API Guide — DeepLinker

  Аутентификация

  Все запросы (кроме редиректов /r/) требуют заголовок:
  Authorization: Bearer <токен>
  Токен создаётся в личном кабинете → Настройки → API-токены.

  ---
  Ссылки

  Создать диплинк
  POST /api/links
  Content-Type: application/json

  {
    "name": "Кроссовки Nike",
    "marketplace": "wb",           // wb | ozon | ym
    "original_url": "https://www.wildberries.ru/catalog/12345/detail.aspx",
    "utm_source": "tg",            // необязательно
    "utm_medium": "post",
    "utm_campaign": "spring2025"
  }
  { "id": "abc123", "short_code": "xK9p2Q", "short_url": "https://yourdomain/r/xK9p2Q" }

  Список ссылок
  GET /api/links

  Удалить ссылку
  DELETE /api/links/:id

  ---
  Мульти-ссылки (несколько площадок в одной)

  Создать
  POST /api/multilinks
  Content-Type: application/json

  {
    "name": "Кроссовки Nike (все площадки)",
    "wb_url":   "https://www.wildberries.ru/...",
    "ozon_url": "https://www.ozon.ru/...",
    "ym_url":   "https://market.yandex.ru/..."
  }

  Список
  GET /api/multilinks

  ---
  Аналитика

  Статистика по ссылке
  GET /api/analytics/:link_id?period=7d
  Период: 1d | 7d | 30d | 90d | all

  Общая аналитика
  GET /api/analytics?period=30d

  ---
  Управление пользователями (только admin)

  GET    /api/admin/users              # список
  POST   /api/admin/users              # создать { username, password, email?, role }
  POST   /api/admin/users/:id/approve  # одобрить заявку
  POST   /api/admin/users/:id/reject   # отклонить
  DELETE /api/admin/users/:id          # удалить

  Управление API-токенами
  GET    /api/admin/tokens             # список токенов
  POST   /api/admin/tokens             # создать { "name": "CI сервер" } → вернёт токен один раз
  DELETE /api/admin/tokens/:id         # отозвать

  ---
  Пример (curl)

  TOKEN="dlk_ваш_токен_здесь"

  # Создать ссылку
  curl -X POST https://yourdomain/api/links \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Тест","marketplace":"ozon","original_url":"https://ozon.ru/t/abc"}'

  # Получить аналитику за 7 дней
  curl https://yourdomain/api/analytics?period=7d \
    -H "Authorization: Bearer $TOKEN"
