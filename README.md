# DeepLinker

Сервис создания и трекинга диплинков для маркетплейсов: **Wildberries**, **Ozon**, **Яндекс Маркет**.

## Быстрый старт

```bash
# Установить зависимости
npm run install:all

# Билд фронтенда
npm run build

# Запуск (сервер + статика)
npm start
# → http://localhost:3001
```

### Разработка (hot reload)
```bash
npm run dev
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

---

## Возможности

- **Создание диплинков** — по ID товара или прямому URL
- **Деferred deeplinks** — на мобильных показывает страницу с кнопкой открытия приложения (wb://, ozon://, yamarket://), с fallback в браузер
- **UTM-параметры** — utm_source, utm_medium, utm_campaign, utm_content, utm_term
- **Аналитика** — клики по дням, платформам (iOS / Android / Desktop), OS, браузеру
- **Короткие ссылки** — `/r/:code` → редирект с трекингом

---

## REST API

**Base URL:** `http://localhost:3001/api`

### Ссылки

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/links` | Список всех ссылок |
| `POST` | `/links` | Создать ссылку |
| `GET` | `/links/:id` | Получить ссылку |
| `DELETE` | `/links/:id` | Удалить ссылку |
| `GET` | `/links/:id/analytics` | Аналитика ссылки |

### Аналитика

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/analytics` | Общая аналитика |

### Редирект

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/r/:code` | Редирект с трекингом |

---

### Пример: создать ссылку

```bash
curl -X POST http://localhost:3001/api/links \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Кроссовки Nike — Telegram",
    "marketplace": "wb",
    "product_id": "16023994",
    "utm_source": "telegram",
    "utm_medium": "organic",
    "utm_campaign": "summer2026"
  }'
```

**Маркетплейсы:** `wb`, `ozon`, `ym`

**Поля:**
- `name` (обязательно) — название ссылки
- `marketplace` (обязательно) — `wb` | `ozon` | `ym`
- `product_id` — ID/артикул товара (или `custom_url`)
- `custom_url` — произвольный URL
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` — UTM-параметры

### Пример ответа

```json
{
  "id": "vyYEaCqkQA",
  "name": "Кроссовки Nike — Telegram",
  "marketplace": "wb",
  "original_url": "https://www.wildberries.ru/catalog/16023994/detail.aspx?utm_source=telegram&utm_medium=organic&utm_campaign=summer2026",
  "short_code": "kp8bNL",
  "created_at": "2026-03-27 10:24:13"
}
```

Короткая ссылка: `http://localhost:3001/r/kp8bNL`

---

## Как работают диплинки

1. Пользователь переходит по `/r/:code`
2. Сервер логирует клик (User-Agent, IP, referrer, платформа)
3. На **мобильных** — показывает страницу с попыткой открыть приложение (`wb://`, `ozon://`, `yamarket://`). Если приложение не установлено — кнопка "Открыть в браузере"
4. На **desktop** — прямой редирект 302 на целевой URL

---

## Технологии

- **Backend**: Node.js 22+ (built-in `node:sqlite`), Express
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts
- **БД**: SQLite (файл `server/deeplinker.db`)
