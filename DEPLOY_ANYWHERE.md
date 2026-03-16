# Deploy Smart Retail for Anywhere Access

This guide lets you use the app from phone, laptop, and multiple devices at the same time without running backend locally.

## Goal

- Frontend hosted on a static host (Vercel/Netlify)
- Backend hosted on a server host (Render/Railway/Fly)
- Database hosted on MongoDB Atlas
- Frontend uses backend URL via `VITE_API_BASE`

## 1. Deploy MongoDB (Atlas)

1. Create a free cluster in MongoDB Atlas.
2. Create a database user.
3. In Network Access, allow your backend host (or `0.0.0.0/0` for quick setup).
4. Copy connection string:

```text
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/smart_retail
```

## 2. Deploy Backend (Render example)

1. Push repo to GitHub.
2. Create a new Web Service in Render, root directory: `backend`.
3. Build command:

```bash
pip install -r requirements.txt
```

4. Start command:

```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

5. Add environment variables:

```text
FLASK_ENV=production
FLASK_DEBUG=0
MONGO_URI=<your atlas connection string>
ALLOWED_ORIGINS=https://<your-frontend-domain>
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_SENDER=<optional>
EMAIL_PASSWORD=<optional>
```

6. Deploy and verify:

```text
https://<your-backend-domain>/health
```

## 3. Deploy Frontend (Vercel example)

1. Import the same repo in Vercel (project root).
2. Build command:

```bash
npm run build
```

3. Output directory:

```text
dist
```

4. Add environment variable:

```text
VITE_API_BASE=https://<your-backend-domain>
```

5. Deploy.

## 4. Update CORS for Multiple Frontends

If you use multiple frontend domains (for example Vercel preview + production + custom domain), set backend env:

```text
ALLOWED_ORIGINS=https://app.vercel.app,https://app-git-main.vercel.app,https://shop.example.com
```

## 5. Use on Any Device

1. Open frontend URL on phone/laptop/browser.
2. All devices use the same hosted backend + database.
3. No need to run local backend anymore.

## 6. Optional: Install on Phone Home Screen

- Open your deployed frontend URL in Chrome/Safari.
- Tap Add to Home Screen.

## Common Issues

- CORS error in browser:
  - Check `ALLOWED_ORIGINS` contains exact frontend domain including `https://`.
- Backend works, frontend cannot load data:
  - Check `VITE_API_BASE` points to backend domain (no trailing slash required).
- Atlas connection timeout:
  - Check Atlas network access and credentials.
