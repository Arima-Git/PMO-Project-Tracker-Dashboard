# PMO Project Tracker Dashboard Backend

A comprehensive Node.js + Express.js backend for the PMO Project Tracker Dashboard with Supabase (Postgres) database integration.

## Stack
- Node.js + Express.js
- Supabase (Postgres) via `@supabase/supabase-js`

## Architecture
Frontend Dashboard ←→ Express.js API ←→ Supabase Tables

## Prerequisites
- Supabase project with tables: `projects`, `simple_projects`, `pmo_comments`, `dropdown_options`, `admin_activity_log`, `system_settings`, `users`
- Configure env: see `.env.example`

## Setup
1. Install dependencies:
```bash
npm install
```
2. Configure environment variables:
- Edit `.env` with your Supabase credentials:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY` for server-side admin)
3. Start the server:
```bash
npm run dev
```

## API
- Health: `/health`
- Projects: `/api/projects`
- Simple Projects: `/api/simple-projects`
- Reports: `/api/reports`
- Admin: `/api/admin`
- Comments: `/api/comments`

## Notes
- Legacy MySQL init/import scripts have been removed. Seed data should be inserted via Supabase SQL editor or API.
- Ensure RLS policies allow your server key to read/write as needed. 