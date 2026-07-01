# Deploying the VCP Screener

**Stack:** Frontend on **Vercel** (free), backend on **Render** (free). Both connect to GitHub for one-click deploys.

## 1. Push the repo to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/vcp-dashboard.git
git push -u origin main
```

## 2. Deploy the backend to Render

1. Sign in at https://render.com (GitHub account works)
2. Click **New → Blueprint**, pick this repo, keep the default branch
3. Render finds `render.yaml` and proposes the `vcp-screener-api` service — click **Apply**
4. Wait ~5–8 minutes for the first Docker build. When it turns green, copy the URL — it looks like `https://vcp-screener-api-xxxx.onrender.com`
5. Verify: `curl https://vcp-screener-api-xxxx.onrender.com/api/health` should print `{"status":"ok",...}`

Free-tier notes:
- The service **spins down after 15 minutes of idle**. First request after sleep takes ~30 seconds to wake up. All subsequent requests are fast.
- 512 MB RAM is enough for scans up to ~500 stocks. For All Stocks (4,415), consider Render's paid tier or Fly.io.

## 3. Deploy the frontend to Vercel

1. Sign in at https://vercel.com with GitHub
2. Click **Add New → Project**, import the repo
3. Vercel detects `vercel.json` — you don't need to touch build settings
4. In **Environment Variables**, add:
   - Key: `VITE_API_BASE`
   - Value: your Render backend URL from step 2 (e.g. `https://vcp-screener-api-xxxx.onrender.com`)
5. Click **Deploy**. In ~1 minute you'll get a URL like `https://vcp-dashboard.vercel.app`

## 4. Verify end-to-end

Open the Vercel URL, pick **Nifty 50**, click **▶ Start Scan**. You should see the counter tick up and cards fill in.

If the first request is slow (~30s), that's Render waking the backend from sleep.

## Updating

Both platforms auto-deploy on `git push` to `main`.

- Backend logs: Render dashboard → your service → **Logs** tab
- Frontend logs (build errors, client-side runtime): Vercel dashboard → your project → **Logs**

## Alternative backend hosts

The `backend/Dockerfile` works unchanged on:
- **Fly.io** — `brew install flyctl && fly launch && fly deploy` (3 GB RAM free tier, no cold starts)
- **Railway** — connect GitHub, autodetects the Dockerfile ($5/mo starter)
- **Google Cloud Run** — `gcloud run deploy --source .` (pay-per-request)

Just update `VITE_API_BASE` in Vercel to point at the new URL.

## Running locally (still works after these changes)

```bash
# Terminal 1 - backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 - frontend
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

Vite still proxies `/api/*` to `http://localhost:8000` when `VITE_API_BASE` is unset — no config changes needed for local dev.