# ArticleHub

Production-ready article & PDF library:

- **Supabase** stores articles and registered users
- **Readers** can browse; **register** to create an account (details in DB)
- **Admin** (`admin` / `admin123`) has privileges to **add & remove** articles
- **Express** serves the API + React production build

## Roles

| Role | Credentials | Capabilities |
|------|-------------|--------------|
| **Admin** | `admin` / `admin123` | Add/remove articles, list users, full dashboard |
| **User** | Self-register | Login, browse library (read-only) |
| **Guest** | — | Browse library without login |

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. SQL Editor → run **`supabase/schema.sql`**
3. Project Settings → API → copy **URL**, **anon key**, **service_role key**

## 2. Environment

```bash
cp .env.example .env
```

Fill in:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=long-random-string
PORT=5000
NODE_ENV=production
```

## 3. Local production build & run

```bash
npm install
npm run build
npm start
```

- Library: http://localhost:5000/
- Register: http://localhost:5000/register
- Login: http://localhost:5000/login
- Admin: http://localhost:5000/admin (after admin login)

On first start the server **seeds** the admin user and sample articles if empty.

## 4. Push to GitHub & deploy

```bash
git init
git add .
git commit -m "ArticleHub production ready"
git branch -M main
git remote add origin https://github.com/YOUR_USER/articlehub.git
git push -u origin main
```

**Never commit `.env`** (already in `.gitignore`).

### Deploy on Render / Railway / Heroku-style hosts

1. Connect the GitHub repo
2. **Build:** `npm install && npm run build`
3. **Start:** `npm start` → `node server/index.js`
4. Set the same env vars as `.env.example` in the host dashboard
5. `PORT` is usually injected by the host automatically

A sample `render.yaml` and `Procfile` are included.

### Important production notes

- Change `ADMIN_PASSWORD` and `JWT_SECRET` after first deploy
- Use **service_role** key only on the server
- PDF uploads are stored on the server disk (`public/pdfs`); use a persistent volume on free tiers or migrate to Supabase Storage later

## API overview

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/auth/register` | Public (creates `user`) |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Logged-in |
| GET | `/api/auth/users` | Admin |
| GET | `/api/articles` | Public |
| POST | `/api/articles` | Admin |
| DELETE | `/api/articles/:id` | Admin |
| GET | `/api/files/:filename` | Public |

## Project layout

```
server/           Express API, auth, seed
src/              React UI
supabase/         schema.sql
public/pdfs/      PDF files on disk
build/            Production React bundle (generated)
```
