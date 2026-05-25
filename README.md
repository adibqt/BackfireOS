# Backfire OS

**Adversarial Brand Simulation Engine** — MarTech Track 2 for THE INFINITY AI BUILDFEST 2026.

Penetration testing for marketing campaigns in emerging markets. Upload a draft campaign and watch five AI red-team personas stress-test it against Bangladesh's cultural, linguistic, and regulatory landscape.

## Quick Start

```powershell
pnpm install
cp .env.example .env.local
# Add GEMINI_API_KEY (free: https://aistudio.google.com/apikey)
pnpm dev
```

Open http://localhost:3000

## Features (Prelim)

- **Red-Team Roster** — 5 parallel adversarial agents with Banglish RAG
- **Meme Mutation Simulator** — 4 parody memes with Memeability scores
- **Backfire Score Dashboard** — 6 composite risk metrics
- **Bangla / English toggle**
- **Placeholder pages** for BuildFest Day features

## Documentation

| File | Purpose |
|---|---|
| [PRELIM_BUILD_GUIDE.md](./PRELIM_BUILD_GUIDE.md) | Full step-by-step build instructions |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture |
| [docs/PRELIM_SUBMISSION_SUMMARY.md](./docs/PRELIM_SUBMISSION_SUMMARY.md) | 1-page submission template |
| [docs/VIDEO_SCRIPT.md](./docs/VIDEO_SCRIPT.md) | 3-minute video script |
| [docs/DEMO_CAMPAIGNS.md](./docs/DEMO_CAMPAIGNS.md) | Staged demo campaigns |

## API Routes

- `POST /api/campaigns` — Create campaign + run
- `POST /api/simulate` — Run agents (SSE stream)
- `POST /api/memes` — Generate memes + scores
- `GET /api/campaigns?runId=` — Fetch run results

## Environment Variables

See [.env.example](./.env.example).

| Key | Required? | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Agents, meme captions, vision, RAG embeddings |
| `POLLINATIONS_API_KEY` | Recommended | Meme images via Pollinations (Flux) |
| `GEMINI_IMAGE_API_KEY` | Optional | Fallback meme images if Pollinations fails |
| Supabase keys | Optional | pgvector semantic RAG + persistence schema |

Demo mode works without keys using mock responses and placeholder images.

## BnSentMix RAG (optional)

Semantic Banglish RAG uses the real [BnSentMix dataset](https://huggingface.co/datasets/aplycaebous/BnSentMix) (~20K rows) in Supabase pgvector.

```powershell
# 1. Run supabase/schema.sql in Supabase SQL Editor (+ GRANT block at bottom)
# 2. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY in .env.local
pnpm download:bnsentmix
pnpm seed:bnsentmix -- --limit 500    # test batch first
pnpm seed:bnsentmix -- --resume       # continue full seed (~5–6 hrs for 20K)
```

Without Supabase, the app falls back to 50 local Banglish samples in `lib/bnsentmix-data.ts`.

## Deploy

```powershell
vercel --prod
```

Add env vars in Vercel dashboard before deploying for live AI.

## License

Team retains full IP per BuildFest Code of Conduct.
