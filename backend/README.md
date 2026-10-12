# VitalWatch Backend (WIP)

In-memory backend module used by Next.js Route Handlers under `app/api/`. **Not wired** to the live patient monitor UI yet—the dashboard still uses client-side vitals simulation.

## Demo credentials

| Email | Password | Role |
|-------|----------|------|
| `nurse@vitalwatch.demo` | `demo123` | nurse |
| `patient@vitalwatch.demo` | `demo123` | patient |

Demo patient ID: `P-2026-0847` (matches dashboard MRN).

## API endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | No |
| POST | `/api/auth/login` | No |
| GET | `/api/users` | Bearer (demo token) |
| GET | `/api/users/[id]` | Bearer |
| POST | `/api/users` | Bearer |
| GET | `/api/vitals?patientId=` | Bearer |
| POST | `/api/vitals` | Bearer |
| POST | `/api/ai/analyze` | Bearer |
| POST | `/api/ai/chat` | Bearer |

Login returns `Authorization: Bearer <wip-token-...>` style tokens stored in memory (resets on server restart).

## Try it

```bash
curl http://localhost:3000/api/health

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nurse@vitalwatch.demo","password":"demo123"}'

# Use token from response:
curl http://localhost:3000/api/vitals?patientId=P-2026-0847 \
  -H "Authorization: Bearer <token>"
```

## Future work

- PostgreSQL / Prisma persistence
- JWT + refresh tokens
- Wire monitor to `GET /api/vitals`
- Real LLM for `/api/ai/*`
