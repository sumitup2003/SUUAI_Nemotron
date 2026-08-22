# Nemo — a Nemotron-powered coding chatbot

A fast, responsive chat app built on Next.js + Tailwind, powered by NVIDIA's
**Nemotron** models. Streaming replies, syntax-highlighted code blocks with
copy buttons, multiple saved chats, and a lightweight task list — all on
free-tier services.

## What's inside

- **Chat** — streamed token-by-token replies, markdown + code rendering
- **New chat / Chats** — create, rename, pin, search, and delete conversations
- **Tasks** — a simple to-do list alongside your chats
- **Model picker** — switch between Nemotron model sizes per chat
- Fully responsive: sidebar becomes a swipeable drawer on mobile

## Stack (100% free tier)

| Piece | Service | Why |
|---|---|---|
| Frontend + API routes | Next.js 14 (App Router) | one deployable app |
| Hosting | [Vercel](https://vercel.com) free plan | zero-config Next.js deploys |
| AI model | [NVIDIA Nemotron](https://build.nvidia.com) via `integrate.api.nvidia.com` | generous free API credits |
| Database | [Supabase](https://supabase.com) free tier (Postgres) | stores chats, messages, tasks |

No paid service is required to run this end to end.

## 1. Get a Nemotron API key

1. Go to <https://build.nvidia.com>, sign in, open any **Nemotron** model card.
2. Click **Get API Key** — copy the key (starts with `nvapi-`).

## 2. Create a free Supabase project

1. Go to <https://supabase.com> → **New project** (free tier).
2. Once it's ready, open **SQL Editor** → **New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   the `chats`, `messages`, and `tasks` tables.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
   - **service_role** key (keep this one secret — server only)

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from steps 1–2:

```bash
cp .env.example .env.local
```

## 4. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## 5. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. Go to <https://vercel.com/new>, import the repo.
3. Under **Environment Variables**, add the same five variables from
   `.env.local` (`NEMOTRON_API_KEY`, `NEMOTRON_MODEL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy. Vercel's free Hobby plan covers this app comfortably.

## Notes

- The Nemotron API key and Supabase service-role key are only ever used on
  the server (`app/api/**/route.ts`) — never sent to the browser.
- Swap in a different Nemotron model any time by editing
  `lib/types.ts` → `NEMOTRON_MODELS`, or picking one from the model
  dropdown in the top bar.
- Everything is stored in your own Supabase project, so chats and tasks
  persist across devices and sessions.
