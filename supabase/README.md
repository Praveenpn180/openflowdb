# Supabase Setup Guide

This guide walks you through setting up the Supabase backend for OpenFlowDB.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Fill in:
   - **Name**: `openflowdb` (or any name)
   - **Database password**: choose a strong password and save it
   - **Region**: pick the closest to your users
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

## 2. Run the Database Migrations

Run each migration file **in order** in the SQL Editor.

1. In your project, go to **SQL Editor** (left sidebar).
2. Click **New query**.
3. Paste the contents of each file below, then click **Run**:

| Order | File | Purpose |
|-------|------|---------|
| 1st | [`migrations/001_diagrams.sql`](./migrations/001_diagrams.sql) | Diagrams table + RLS |
| 2nd | [`migrations/002_shares.sql`](./migrations/002_shares.sql) | Share links + RLS |
| 3rd | [`migrations/003_versions.sql`](./migrations/003_versions.sql) | Version history + RLS |

> **Tip**: You can paste all three files into a single query and run them together — they are written in dependency order.

---

## 3. Configure Authentication

### 3a. Enable Email Auth (already on by default)

1. Go to **Authentication → Providers**.
2. Confirm **Email** is enabled.
3. Under **Email Auth settings**, consider disabling **Email confirmations** during development (toggle off **Confirm email**). Re-enable before going to production.

### 3b. Enable GitHub OAuth (optional)

1. Go to [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers).
2. Click **New OAuth App**:
   - **Application name**: `OpenFlowDB`
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Authorization callback URL**: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Save the **Client ID** and generate a **Client Secret**.
4. Back in Supabase → **Authentication → Providers → GitHub**:
   - Toggle **Enable GitHub provider**.
   - Paste the Client ID and Client Secret.
   - Click **Save**.

### 3c. Set Redirect URLs

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to your app URL:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/dashboard`
   - `https://your-domain.com/dashboard` (production)

---

## 4. Get Your API Keys

1. Go to **Project Settings → API** (gear icon in left sidebar).
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public** key → `VITE_SUPABASE_ANON_KEY`

---

## 5. Configure the App

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the values:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   VITE_APP_URL=http://localhost:3000
   ```

---

## 6. Verify the Setup

After running the migrations and starting the dev server:

1. Open `http://localhost:3000/login`.
2. Create an account with email and password.
3. You should be redirected to `/dashboard`.
4. Click **New diagram** — it should open the editor with a `?id=` param in the URL.
5. Make some changes and reload — the diagram should still be there (saved to Supabase).

---

## Row-Level Security Summary

All tables have RLS enabled. Here's what each policy allows:

| Table | Who can read | Who can write |
|-------|-------------|---------------|
| `diagrams` | Owner + anyone with a share link | Owner + share editors |
| `diagram_shares` | Everyone (to resolve tokens) | Owner only |
| `diagram_versions` | Owner only | Owner only |

> **Important**: Never expose your `service_role` key in the frontend. Only `anon` key is safe for client-side use — RLS enforces all access rules at the database level.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "new row violates RLS policy" | Make sure the user is signed in and the `owner_id` matches `auth.uid()` |
| GitHub OAuth "redirect_uri_mismatch" | Check the callback URL in your GitHub OAuth app matches Supabase's exactly |
| Diagrams not saving | Check browser console for Supabase errors; verify `.env` values are correct |
| Share links not working | Confirm migration 002 ran successfully and the `diagram_shares` table exists |
