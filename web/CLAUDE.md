# Web Application — Next.js 16

## Stack
- Next.js 16 with App Router (Server Components by default)
- shadcn/ui component library
- Tailwind CSS for styling
- Drizzle ORM + SQLite (dev) / Neon Postgres (prod)
- Zod for validation

## Conventions
- All routes in `src/app/`
- Server Components by default; only use `'use client'` when interactivity is required
- Push `'use client'` boundaries as far down the component tree as possible
- Server Actions (`'use server'`) for form mutations, not Route Handlers (unless building a public API)
- `'use cache'` directive for data caching
- All async request APIs: `await cookies()`, `await headers()`, `await params`, `await searchParams`
- `proxy.ts` at `src/proxy.ts` for middleware (NOT `middleware.ts`)
- Environment variables via `process.env` — never hardcode secrets
- Turbopack is the default bundler (config is top-level in `next.config.ts`)

## Project Initialization
If the `web/` directory is empty, initialize with:
```bash
npx create-next-app@latest web --ts --tailwind --eslint --app --src-dir --turbopack
cd web && npx shadcn@latest init
```

## Before Handoff Checklist
- [ ] `npm run build` succeeds with no errors
- [ ] `npm run dev` starts and all routes are accessible
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All user stories for this sprint are implemented
- [ ] Handoff JSON written to `../artifacts/handoffs/web-handoff-{sprint}.json`
- [ ] Git committed with descriptive message
