# Echo Studio (Web)

Next.js 14 app router experience for Echo's analytics dashboard.

## Stack

- Next.js 14 + TypeScript
- TailwindCSS + shadcn/ui primitives
- React Query for data fetching
- Recharts + Framer Motion for insight visuals
- Supabase Auth helpers

## Getting started

```bash
pnpm install   # or npm install / yarn
pnpm dev
```

Environment variables live in the repo-level `.env.example`. Ensure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_BASE` are set.
