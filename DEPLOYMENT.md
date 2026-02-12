# Deploy Client to Vercel

## 1. Connect repository

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. **Add New** → **Project**.
3. Import **IshaProjects/SadhguruWisdomWarriors** (or your client repo).
4. Leave **Root Directory** as `.` (repo root is the client app).

## 2. Build settings (optional)

Vercel usually detects Vite. If needed, set:

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## 3. Environment variables

Add in Vercel: **Project → Settings → Environment Variables**.

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | **Required in production.** Full API URL of your backend (Digital Ocean server). | `https://your-app.ondigitalocean.app/api` |

- For production, set `VITE_API_BASE_URL` to your deployed server URL (e.g. `https://sadhguruwisdomwarriors-xxxxx.ondigitalocean.app/api`).
- Leave empty only if you rely on same-origin `/api` (e.g. reverse proxy); for separate Vercel + DO, set this.

## 4. Deploy

Click **Deploy**. Later pushes to `main` will trigger automatic deployments.

## 5. After server is live

Once the server is deployed on Digital Ocean, copy its public URL, add `/api` at the end, and set **VITE_API_BASE_URL** in Vercel to that value. Redeploy the client so the app talks to the production API.
