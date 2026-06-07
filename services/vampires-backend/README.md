# Vampires Classroom Backend

Authenticated Socket.IO backend for the learning-platform route
`/games/vampires`.

## Local checks

```bash
npm ci
npm test
npm start
```

The server listens on `PORT` (default `3001`) and exposes
`GET /healthz`.

## Northflank

Update the existing `vampires-backend` combined service so its public
`code.run` address remains unchanged.

### Build source

- Repository: `fizlib/physapp`
- Branch: `main`
- Build type: `Dockerfile`
- Dockerfile: `/services/vampires-backend/Dockerfile`
- Build context: `/services/vampires-backend`
- Optional CI allow path: `/services/vampires-backend/**`

### Runtime variables

Required:

```text
SUPABASE_URL=<learning platform Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<learning platform service role key>
ALLOWED_ORIGINS=https://protus.lt,https://www.protus.lt,http://localhost:3000
PORT=3001
```

Keep any existing optional integration variables used by the game:

```text
GEMINI_API_KEY
DEEPGRAM_API_KEY
GOOGLE_STT_API_KEY
GOOGLE_TTS_API_KEY
GOOGLE_APPLICATION_CREDENTIALS
ELEVENLABS_API_KEY
ELEVENLABS_API_KEY2
```

### Runtime configuration

- Public HTTP port: `3001`
- Instances: exactly `1`
- Readiness probe: HTTP `GET /healthz` on port `3001`
- Liveness probe: HTTP `GET /healthz` on port `3001`
- CI and CD: enabled

Classroom sessions are stored in memory. More than one replica would split
students between separate Socket.IO processes, and a restart intentionally
clears active games.

## Learning platform

Set this Vercel runtime variable and redeploy the platform:

```text
NEXT_PUBLIC_VAMPIRES_SERVER_URL=https://http--vampires-classroom-backend--k46wscvdzqkf.code.run
```
