# learntolarp.com — PRD

## Original problem statement
A reference site where searching any person/band/franchise/fandom returns an AI-generated "case file" — enough real, cited info to convincingly join a conversation. Framed as a tongue-in-cheek intelligence-briefing conceit. Audience: teens 13-17. 70% real utility, 30% joke. Mobile-first. Cached indefinitely once generated.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB). LLM template-fill via `emergentintegrations` (Anthropic Claude Sonnet 4.6). Provider is env-swappable (`LLM_PROVIDER`, `LLM_MODEL`) — future switch to OpenRouter free tier (meta-llama/llama-3.3-70b-instruct:free) is one env change away.
- **Frontend**: React 19 + Tailwind + react-router 7. Sonner for toasts. html2canvas for PNG export.
- **DB collections**: `entities` (cached case files keyed by slug), `queue` (redacted/requested entities).

## Endpoints
- `POST /api/entities/generate` — generates and caches, idempotent (bumps infiltration_count on re-hit)
- `GET /api/entities/{slug}` — returns cached case file or 404
- `GET /api/entities?sort=trending|recent&limit=` — grid feed
- `POST /api/entities/queue` — request an ungenerated entity
- `GET /api/queue` — list requested entities

## What's been implemented (Feb 2026)
- Landing: hero "KNOW THE VIBE / SKIP THE DEEP DIVE", search + suggestions + category filters + trending grid + queue strip + mission note
- Entity page: LarpabilityHero with stamp-badge score (the ONE bold moment), 5-second briefing banner, FACT form-field rows with cite links, CULTURE section (must-say/never-say callouts, insider glossary, running debates, dangerous-territory warning), Quotes transcript with speaker initials + reason tags, Perception dual gauge, Latest with honest empty state, Conversation Starters 3 tiers with copy buttons, CrossReferences with redacted/queued state, ExportCheatSheet PNG + copy-text modal
- Global palette: aged paper (#F7F4EE), ink navy (#0F172A), stamp red (#DC2626) used sparingly
- Type: Barlow Condensed display + Work Sans body + JetBrains Mono metadata

## Prioritized backlog
- P1: Better search UX (autocomplete against existing entities before hitting generate)
- P1: SEO/OG image for shared entity URLs (server-render PNG for og:image)
- P1: Rate limiting on /generate (prevent spam of LLM key)
- P2: OpenRouter provider integration (swap via env when key available)
- P2: Category tags stored on entity so category filter works on trending grid
- P2: Admin/mod flow to review/regenerate a bad case file
- P3: User accounts + saved case files ("my binder")
- P3: Streaming generation so the page fills in section-by-section

## User personas
- Teen catching up before a Discord call about a band their friend just got into
- Person about to attend an event/watch a show they know nothing about
- Anyone who doesn't want to look lost in a niche conversation
