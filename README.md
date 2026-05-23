# GrowControl

Отдельный продукт на базе стека money-magnet-analytics (Vite, React, TypeScript, Tailwind, shadcn).

## Локальная разработка

```bash
cd ~/Documents/GrowControl
cp .env.example .env   # заполните своим Supabase
npm install
npm run dev
```

Dev-сервер: **http://localhost:8081** (8080 занят money-magnet-analytics).

## Workspace в Cursor

Откройте `~/Documents/dev.code-workspace` — в одном окне будут GrowControl и money-magnet-analytics (reference).

## Supabase: применить схему

Миграции лежат в `supabase/migrations/`.

**Через CLI** (рекомендуется):

```bash
supabase login
supabase link --project-ref elxfrbcpldzfipunkfvq
supabase db push
```

**Или вручную:** Supabase Dashboard → SQL Editor → выполнить файлы миграций по порядку.

### Таблицы

| Таблица | Назначение |
|---------|------------|
| `profiles` | Профиль пользователя (создаётся при регистрации) |
| `projects` | Проекты роста (бизнес / продукт) |
| `hypotheses` | Гипотезы роста внутри проекта |
| `project_events` | Лента событий по проекту |

RLS: каждый пользователь видит и меняет только свои данные.

## Домен controlgrow.ru

### Supabase Auth

В `supabase/config.toml` настроены:

- **Site URL:** `https://controlgrow.ru`
- **Redirect URLs:** production + `localhost:8081`

Применить на remote:

```bash
supabase config push --yes
```

### Timeweb (хостинг)

1. В панели Timeweb привязать домен **controlgrow.ru** к сайту (отдельная папка или поддоменный аккаунт).
2. Включить **SSL** (Let's Encrypt) для `controlgrow.ru` и редирект `www → controlgrow.ru`.
3. DNS у регистратора:
   - **A** `@` → IP хостинга Timeweb
   - **A** или **CNAME** `www` → тот же хост (или редирект через `.htaccess`, уже в `public/.htaccess`)

### GitHub Actions → FTP

Workflow: `.github/workflows/deploy-controlgrow.yml` — push в `main` собирает `dist/` и заливает на Timeweb.

Secrets в репозитории GrowControl:

| Secret | Значение |
|--------|----------|
| `VITE_SUPABASE_URL` | `https://elxfrbcpldzfipunkfvq.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key из Supabase |
| `VITE_SUPABASE_PROJECT_ID` | `elxfrbcpldzfipunkfvq` |
| `TIMEWEB_FTP_HOST` | FTP-хост Timeweb |
| `TIMEWEB_FTP_USER` | FTP-логин сайта controlgrow.ru |
| `TIMEWEB_FTP_PASSWORD` | FTP-пароль |
| `TIMEWEB_FTP_SERVER_DIR` | Путь к корню сайта на сервере, напр. `/public_html/` |

Prod: **https://controlgrow.ru**

Подробно: [docs/DEPLOY.md](docs/DEPLOY.md)

## Что не шарить с pishalking.ru

- Supabase project / `.env`
- `supabase/migrations`
- deploy credentials
