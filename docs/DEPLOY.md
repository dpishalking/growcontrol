# Деплой controlgrow.ru

## 1. FTP (Timeweb)

**Сайты → controlgrow.ru → FTP** (или Файловый менеджер → путь к корню).

Скопируйте:

```bash
cp .env.deploy.example .env.deploy
```

Заполните `.env.deploy`:

| Переменная | Где взять |
|------------|-----------|
| `TIMEWEB_FTP_HOST` | FTP-хост (часто `92.53.96.132` или `vhXXX.timeweb.ru`) |
| `TIMEWEB_FTP_USER` | FTP-логин |
| `TIMEWEB_FTP_PASSWORD` | FTP-пароль |
| `TIMEWEB_FTP_SERVER_DIR` | Обычно `/domains/controlgrow.ru/public_html/` |

Локальный деплой:

```bash
npm run deploy
```

---

## 2. GitHub репозиторий

```bash
# на github.com: New repository → GrowControl (private)
git remote add origin git@github.com:dpishalking/GrowControl.git
git push -u origin main
```

---

## 3. GitHub Secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Значение |
|--------|----------|
| `VITE_SUPABASE_URL` | `https://elxfrbcpldzfipunkfvq.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key из Supabase → Project Settings → API |
| `VITE_SUPABASE_PROJECT_ID` | `elxfrbcpldzfipunkfvq` |
| `TIMEWEB_FTP_HOST` | из `.env.deploy` |
| `TIMEWEB_FTP_USER` | из `.env.deploy` |
| `TIMEWEB_FTP_PASSWORD` | из `.env.deploy` |
| `TIMEWEB_FTP_SERVER_DIR` | из `.env.deploy` |

После push в `main` workflow **Deploy controlgrow.ru (Timeweb)** зальёт `dist/` на хостинг.

Ручной запуск: **Actions → Deploy controlgrow.ru → Run workflow**.
