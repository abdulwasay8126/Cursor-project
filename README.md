# Feedback Wall

React + Tailwind app with Supabase backend.

Setup:
1) Create a Supabase project and set table `public.feedback` with columns (id uuid, message text, author text, votes int, created_at timestamptz).
2) Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3) Install deps and run:

```bash
npm i
npm run dev
```

Features:
- No login. Post and upvote.
- One upvote per post per browser (localStorage).
- Realtime updates via Supabase Realtime.
- Filters (Newest/Top), search, dark mode.
