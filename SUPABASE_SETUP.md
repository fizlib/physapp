# Supabase Setup Guide

Follow these steps to set up your backend for **Physapp**.

## 1. Create a Supabase Project
1. Go to [database.new](https://database.new) and sign in/sign up.
2. Click **"New Project"**.
3. **Organization**: Select your organization.
4. **Name**: `physics-app` (or any name you prefer).
5. **Database Password**: Generate a secure password and **save it** (you might need it later).
6. **Region**: Choose a region close to your users.
7. Click **"Create new project"** and wait for it to provision (takes ~1-2 mins).

## 2. Run the Database Schema
1. Once the project is ready, look at the left sidebar.
2. Click on the **SQL Editor** icon (looks like a terminal `>_`).
3. Click **"New query"** (top left of the SQL editor pane).
4. Open the `supabase-schema.sql` file in this repository.
5. Copy **all** the content of `supabase-schema.sql`.
6. Paste it into the SQL Editor in Supabase.
7. Click the **Run** button (bottom right of the editor).
   - You should see "Success" in the results pane.

## 3. Get API Credentials
The settings are now split into two tabs in the sidebar:

**For the Project URL:**
1. Click **Data API** in the sidebar.
2. Copy the **Project URL** (it looks like `https://xyz.supabase.co`).

**For the API Key:**
1. Click **API Keys** in the sidebar.
2. Copy the `anon` / `public` key.

## 4. Configure Environment Variables
1. In your local project root (`physics-app/`), create a file named `.env.local`.
2. Copy the contents from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
3. Open `.env.local` and paste your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 5. Ready!
Your database setup is complete. You can now proceed with the application development.
