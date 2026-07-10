# Deploy ArticleHub

## Repository

https://github.com/Ganapathy-bot/articlehub

Secrets are stored as **GitHub repository secrets** (not in the repo).  
`.env` is never committed.

## Before first deploy: create Supabase tables

1. Open [SQL Editor](https://supabase.com/dashboard/project/unpmthqbuhzdsjrzjskh/sql/new)
2. Paste and run `supabase/schema.sql`
3. Confirm tables `articles` and `users` exist under **Table Editor**

## Option A — Render (recommended, free tier)

### One-click

[Deploy to Render](https://render.com/deploy?repo=https://github.com/Ganapathy-bot/articlehub)

### Manual

1. Sign in at [render.com](https://render.com) with GitHub
2. **New → Web Service** → connect `Ganapathy-bot/articlehub`
3. Settings:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Instance:** Free
4. **Environment** variables:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://unpmthqbuhzdsjrzjskh.supabase.co` |
| `SUPABASE_ANON_KEY` | (publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (secret key) |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `admin123` |
| `JWT_SECRET` | long random string |
| `PORT` | (Render sets this automatically — optional) |

5. Deploy → open the `*.onrender.com` URL

## Option B — Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select `articlehub`
3. Add the same env vars as above
4. Deploy

## Option C — Docker (any VPS)

```bash
docker build -t articlehub .
docker run -p 5000:5000 --env-file .env articlehub
```

## After deploy

| URL path | Purpose |
|----------|---------|
| `/` | Public library |
| `/register` | User registration |
| `/login` | User / admin login |
| `/admin` | Admin dashboard (`admin` / `admin123`) |

## Local production

```bash
npm install
npm run build
npm start
```

Open http://localhost:5000
