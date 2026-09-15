from fastapi import FastAPI, APIRouter, HTTPException, Request, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import random
import logging
import uuid
import httpx
import unicodedata
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Mongo ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("learntolarp")

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "anthropic")
LLM_MODEL = os.environ.get("LLM_MODEL", "claude-sonnet-4-6")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")[:80]


STOP_PREFIXES = ("the ", "a ", "an ")


def normalize_key(s: str) -> str:
    """Aggressive lookup key: lowercased, punctuation-stripped, 'the ' removed, slugified."""
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.lower().strip()
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    for p in STOP_PREFIXES:
        if s.startswith(p):
            s = s[len(p):]
            break
    return s.replace(" ", "-")


def variant_keys(s: str) -> List[str]:
    """Return alias-lookup variants: base, plural, singular."""
    n = normalize_key(s)
    if not n:
        return []
    out = {n}
    if n.endswith("s") and not n.endswith("ss") and len(n) > 3:
        out.add(n[:-1])
    else:
        out.add(n + "s")
    return list(out)


# ---------- Models ----------
class FactItem(BaseModel):
    label: str
    value: str
    source: Optional[str] = None


class InsiderTerm(BaseModel):
    term: str
    meaning: str


class Culture(BaseModel):
    nicknames: List[str] = []
    insider_terms: List[InsiderTerm] = []
    must_say: str = ""
    never_say: str = ""
    running_debates: List[str] = []
    dangerous_territory: str = ""


class Quote(BaseModel):
    speaker: str
    quote: str
    context: str = ""
    reason: str


class SentimentPoint(BaseModel):
    point: str
    source: Optional[str] = None


class Perception(BaseModel):
    fans_pct: int = 70
    critics_pct: int = 55
    fans_say: List[SentimentPoint] = []
    critics_say: List[SentimentPoint] = []


class NewsItem(BaseModel):
    date: str
    headline: str
    link: Optional[str] = None


class Starters(BaseModel):
    safe: List[str] = []
    medium: List[str] = []
    risky: List[str] = []


class CrossRef(BaseModel):
    name: str
    slug: str


class Larpability(BaseModel):
    tier: str
    difficulty: str
    reasoning: str


class CaseFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    name: str
    entity_type: str
    one_line_context: str
    larpability: Larpability
    trending: bool = False
    first_larped_by: str = "Analyst-00"
    briefing_5sec: List[str] = []
    fact: List[FactItem] = []
    culture: Culture
    quotes: List[Quote] = []
    perception: Perception
    latest: List[NewsItem] = []
    latest_quiet_note: Optional[str] = None
    starters: Starters
    cross_refs: List[CrossRef] = []
    mission_note: str = ""
    sources: List[str] = []
    infiltration_count: int = 1
    created_at: str = Field(default_factory=now_iso)
    last_freshness_check: Optional[str] = None


class GenerateRequest(BaseModel):
    query: str
    first_larped_by: Optional[str] = None  # optional custom handle


class QueueRequest(BaseModel):
    name: str
    slug: Optional[str] = None


class ApproveRequest(BaseModel):
    slug: str
    name: Optional[str] = None
    auto_generate: bool = False


# ---------- LLM ----------
SYSTEM_PROMPT = """You are the case-file compiler for learntolarp.com — a reference tool for teenagers (13-17) who want to convincingly join a conversation about ANYTHING larpable: bands, artists, franchises, shows, athletes, subcultures, aesthetics, time periods, fashion movements, memes, sports, foods, places, historical eras — anything a fandom or scene forms around.

DISAMBIGUATION: If the query could refer to more than one thing (e.g. "Kiss" the band vs the song vs the movie), pick the most culturally dominant interpretation for a 13-17 year old audience, name it explicitly in the case file, and note the other meanings briefly in the one_line_context.

TONE: Discord/gaming-adjacent. Plain, direct, not academic, not corny. 70% real utility, 30% wink.

STRICT RULES:
- Output ONLY valid JSON. No markdown fences. No preamble.
- Quotes must be REAL things the person/character/creator actually said. NEVER lyrics, NEVER invented quotes. If you cannot cite 3+ real quotes, return fewer (or an empty list for non-person entities where quotes don't apply — but always try).
- Facts must be verifiable with source URLs where possible.
- "dangerous_territory" is ONE fandom debate with no safe answer.
- "latest" reflects recent activity. If nothing significant, return [] and set latest_quiet_note to an in-voice line.
- "cross_refs" lists 4-8 related entities. Use plain slugs (lowercase, dashes).
- Never editorialize. fans_say/critics_say is REPORTED sentiment, not the site's opinion.
"""

TEMPLATE_INSTRUCTION = """Return ONE JSON object with this exact shape:

{
  "name": "canonical name of the thing",
  "entity_type": "one word category — e.g. band, artist, franchise, show, film, person, athlete, era, aesthetic, trend, subculture, meme, sport, cuisine, place, event, game, book, character",
  "one_line_context": "one sentence explaining what this is; if the name is ambiguous, briefly note which interpretation this file covers",
  "larpability": {
    "tier": "S|A|B|C",
    "difficulty": "easy|moderate|hard|nightmare",
    "reasoning": "one sentence on why"
  },
  "trending": true or false,
  "first_larped_by": "a short pseudonymous handle like 'Agent-K13'",
  "briefing_5sec": ["line 1", "line 2", "line 3"],
  "fact": [
    {"label": "FORMED|BORN|ORIGIN|etc", "value": "...", "source": "url"}
  ],
  "culture": {
    "nicknames": ["...", "..."],
    "insider_terms": [{"term": "...", "meaning": "..."}],
    "must_say": "one nod-of-approval take",
    "never_say": "one dogpile take",
    "running_debates": ["...", "..."],
    "dangerous_territory": "the one no-safe-answer topic"
  },
  "quotes": [
    {"speaker": "who", "quote": "real quote", "context": "brief where/when", "reason": "why included"}
  ],
  "perception": {
    "fans_pct": 0-100,
    "critics_pct": 0-100,
    "fans_say": [{"point": "...", "source": "url"}],
    "critics_say": [{"point": "...", "source": "url"}]
  },
  "latest": [{"date": "YYYY-MM", "headline": "...", "link": "url"}],
  "latest_quiet_note": null or "in-voice line if empty",
  "starters": {
    "safe": ["..."],
    "medium": ["..."],
    "risky": ["..."]
  },
  "cross_refs": [{"name": "...", "slug": "..."}],
  "mission_note": "one honest in-voice line",
  "sources": ["url", "url"]
}

Aim: 3-5 quotes, 4-6 cross_refs, 2 items each starters tier, 5 fact rows, 3+ insider terms."""


def _extract_json(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object in LLM response")
    return json.loads(text[start : end + 1])


async def _llm_generate(query: str) -> str:
    """Call the configured LLM provider and return raw text response."""
    prompt = (
        f'Compile the case file for: "{query}".\n\n'
        f"{TEMPLATE_INSTRUCTION}\n\nJSON ONLY. No explanation before or after."
    )
    if LLM_PROVIDER == "openrouter":
        if not OPENROUTER_API_KEY:
            raise HTTPException(500, "OPENROUTER_API_KEY not set")
        async with httpx.AsyncClient(timeout=90.0) as c:
            r = await c.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://learntolarp.com",
                    "X-Title": "learntolarp",
                },
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.6,
                    "response_format": {"type": "json_object"},
                },
            )
        if r.status_code != 200:
            logger.error(f"OpenRouter error {r.status_code}: {r.text[:400]}")
            raise HTTPException(502, "LLM compile failed")
        return r.json()["choices"][0]["message"]["content"]

    # default: emergent (anthropic / openai / gemini)
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not set")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"casefile-{uuid.uuid4()}",
        system_message=SYSTEM_PROMPT,
    ).with_model(LLM_PROVIDER, LLM_MODEL)
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp if isinstance(resp, str) else str(resp)


async def compile_case_file(query: str, first_larped_by: Optional[str] = None) -> CaseFile:
    raw = await _llm_generate(query)
    try:
        data = _extract_json(raw)
    except Exception as e:
        logger.error(f"JSON parse failed: {e} | raw: {raw[:400]}")
        raise HTTPException(502, "Failed to parse case file from LLM")

    canonical_name = data.get("name", query)
    slug = slugify(canonical_name)
    if not slug:
        slug = slugify(query)

    handle = first_larped_by or data.get("first_larped_by") or "Analyst-00"
    handle = re.sub(r"[^\w\-]", "", handle)[:24] or "Analyst-00"

    return CaseFile(
        slug=slug,
        name=canonical_name,
        entity_type=data.get("entity_type", "franchise"),
        one_line_context=data.get("one_line_context", ""),
        larpability=Larpability(**data.get("larpability", {"tier": "B", "difficulty": "moderate", "reasoning": ""})),
        trending=bool(data.get("trending", False)),
        first_larped_by=handle,
        briefing_5sec=data.get("briefing_5sec", []),
        fact=[FactItem(**f) for f in data.get("fact", [])],
        culture=Culture(**data.get("culture", {})),
        quotes=[Quote(**q) for q in data.get("quotes", [])],
        perception=Perception(**data.get("perception", {})),
        latest=[NewsItem(**n) for n in data.get("latest", [])],
        latest_quiet_note=data.get("latest_quiet_note"),
        starters=Starters(**data.get("starters", {})),
        cross_refs=[CrossRef(**c) for c in data.get("cross_refs", [])],
        mission_note=data.get("mission_note", ""),
        sources=data.get("sources", []),
    )


# ---------- Approved / Queue helpers ----------
async def is_approved(slug: str) -> bool:
    for k in variant_keys(slug):
        if await db.approved.find_one({"key": k}, {"_id": 0}):
            return True
    doc = await db.approved.find_one({"slug": slug}, {"_id": 0})
    return doc is not None


# Basic handle blocklist (obvious slurs / abuse-adjacent tokens).
# Not exhaustive on purpose — falls back to 'Anonymous' after too many bad attempts.
HANDLE_BLOCKLIST = {
    "admin", "root", "null", "undefined", "system", "moderator", "learntolarp",
    "nigger", "nigga", "faggot", "retard", "tranny", "kike", "chink", "spic",
    "cunt", "rape", "rapist", "nazi", "hitler", "kys", "kms",
}


def sanitize_handle(raw: Optional[str]) -> Optional[str]:
    """Return a cleaned handle or None if it should be rejected."""
    if not raw:
        return None
    s = raw.strip()
    if not s:
        return None
    # allow letters, numbers, dashes and underscores; trim length
    s = re.sub(r"[^\w\-]", "", s)[:24]
    if not s or len(s) < 2:
        return None
    lower = s.lower()
    for bad in HANDLE_BLOCKLIST:
        if bad in lower:
            return None
    return s


async def record_hit(slug: str):
    """Log a page hit for velocity-based trending (last 7 days)."""
    await db.hits.insert_one({"slug": slug, "ts": now_iso()})


async def register_aliases(canonical_slug: str, query: str, canonical_name: str):
    keys = set(variant_keys(query)) | set(variant_keys(canonical_name)) | set(variant_keys(canonical_slug))
    for k in keys:
        if not k:
            continue
        await db.aliases.update_one(
            {"key": k},
            {"$set": {"key": k, "canonical_slug": canonical_slug}},
            upsert=True,
        )


async def lookup_by_query(query: str) -> Optional[dict]:
    """Try to find an existing entity by query. Direct slug, then aliases."""
    direct = slugify(query)
    if direct:
        doc = await db.entities.find_one({"slug": direct}, {"_id": 0})
        if doc:
            return doc
    for k in variant_keys(query):
        alias = await db.aliases.find_one({"key": k}, {"_id": 0})
        if alias:
            doc = await db.entities.find_one({"slug": alias["canonical_slug"]}, {"_id": 0})
            if doc:
                return doc
    return None


# ---------- Approved-list seed ----------
APPROVED_SEED = [
    ("Radiohead", "band"), ("The Beatles", "band"), ("Nirvana", "band"),
    ("Taylor Swift", "artist"), ("Chappell Roan", "artist"), ("Sabrina Carpenter", "artist"),
    ("MF DOOM", "artist"), ("Kendrick Lamar", "artist"), ("Frank Ocean", "artist"),
    ("Billie Eilish", "artist"), ("Tyler, The Creator", "artist"), ("Lana Del Rey", "artist"),
    ("BTS", "group"), ("BLACKPINK", "group"), ("NewJeans", "group"),
    ("Arcane", "show"), ("Attack on Titan", "franchise"), ("Genshin Impact", "game"),
    ("One Piece", "franchise"), ("Demon Slayer", "franchise"), ("Jujutsu Kaisen", "franchise"),
    ("Marvel Cinematic Universe", "franchise"), ("Star Wars", "franchise"),
    ("Harry Potter", "franchise"), ("The Legend of Zelda", "franchise"),
    ("Formula 1", "sport"), ("NBA", "sport"), ("UFC", "sport"),
    ("Y2K", "aesthetic"), ("Cottagecore", "aesthetic"), ("Dark Academia", "aesthetic"),
    ("Coquette", "aesthetic"), ("Grunge", "aesthetic"), ("2000s Emo", "era"),
    ("Vaporwave", "aesthetic"), ("Cyberpunk", "aesthetic"),
    ("Studio Ghibli", "franchise"), ("A24", "brand"),
    ("Fortnite", "game"), ("Minecraft", "game"), ("Roblox", "game"),
]


async def seed_approved_once():
    count = await db.approved.count_documents({})
    if count > 0:
        return
    for name, etype in APPROVED_SEED:
        slug = slugify(name)
        keys = variant_keys(name) + variant_keys(slug)
        for k in set(keys):
            if not k:
                continue
            await db.approved.update_one(
                {"key": k},
                {"$set": {"key": k, "slug": slug, "name": name, "entity_type": etype, "seeded": True}},
                upsert=True,
            )


@app.on_event("startup")
async def _startup():
    await seed_approved_once()


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"service": "learntolarp", "status": "ok", "provider": LLM_PROVIDER, "model": LLM_MODEL}


@api_router.post("/entities/generate")
async def entity_generate(req: GenerateRequest):
    """Compile-on-demand for approved entities. Non-approved queries go to the request queue."""
    query = req.query.strip()
    if not query:
        raise HTTPException(400, "Empty query")

    # cache/alias hit — always serve
    cached = await lookup_by_query(query)
    if cached:
        await db.entities.update_one(
            {"slug": cached["slug"]}, {"$inc": {"infiltration_count": 1}}
        )
        await record_hit(cached["slug"])
        cached["infiltration_count"] = cached.get("infiltration_count", 1) + 1
        return CaseFile(**cached).model_dump()

    # approved gate
    approved_hit = None
    for k in variant_keys(query):
        approved_hit = await db.approved.find_one({"key": k}, {"_id": 0})
        if approved_hit:
            break
    if not approved_hit:
        # queue it — no paid LLM call
        key = normalize_key(query) or slugify(query)
        await db.queue.update_one(
            {"key": key},
            {
                "$set": {"key": key, "name": query, "slug": slugify(query), "queued_at": now_iso()},
                "$inc": {"votes": 1},
            },
            upsert=True,
        )
        entry = await db.queue.find_one({"key": key}, {"_id": 0})
        return {
            "status": "queued",
            "key": key,
            "name": query,
            "votes": entry.get("votes", 1),
            "message": "Checking whether there's enough intelligence to build this file. Added to the request queue.",
        }

    # generate a real case file
    handle = sanitize_handle(req.first_larped_by)
    case = await compile_case_file(query, handle)
    doc = case.model_dump()

    # if we accidentally collide with an existing slug (LLM canonicalized to something we have), serve that
    existing = await db.entities.find_one({"slug": doc["slug"]}, {"_id": 0})
    if existing:
        await db.entities.update_one(
            {"slug": existing["slug"]}, {"$inc": {"infiltration_count": 1}}
        )
        existing["infiltration_count"] = existing.get("infiltration_count", 1) + 1
        await register_aliases(existing["slug"], query, existing["name"])
        await record_hit(existing["slug"])
        return CaseFile(**existing).model_dump()

    await db.entities.insert_one(doc)
    await register_aliases(doc["slug"], query, doc["name"])
    await record_hit(doc["slug"])
    # promote approved entry to full alias (persist canonical_slug for future lookups)
    if approved_hit and approved_hit.get("slug") != doc["slug"]:
        await db.approved.update_many(
            {"slug": approved_hit["slug"]},
            {"$set": {"slug": doc["slug"]}},
        )
    await db.queue.delete_many({"key": {"$in": variant_keys(query)}})
    return case.model_dump()


@api_router.get("/entities/{slug}")
async def entity_get(slug: str):
    doc = await db.entities.find_one({"slug": slug}, {"_id": 0})
    if doc:
        await record_hit(doc["slug"])
        return CaseFile(**doc).model_dump()
    # alias fallback
    for k in variant_keys(slug):
        alias = await db.aliases.find_one({"key": k}, {"_id": 0})
        if alias:
            doc = await db.entities.find_one({"slug": alias["canonical_slug"]}, {"_id": 0})
            if doc:
                await record_hit(doc["slug"])
                return CaseFile(**doc).model_dump()
    raise HTTPException(404, "Case file not compiled yet")


@api_router.get("/entities")
async def entity_list(limit: int = 12, sort: str = "trending", window_days: int = 7):
    """
    sort=trending: rank by hits in the last `window_days` (velocity)
    sort=recent:   most recently compiled
    sort=lifetime: total infiltration_count
    """
    items: List[dict] = []

    if sort == "recent":
        cursor = db.entities.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
        items = await cursor.to_list(limit)
    elif sort == "lifetime":
        cursor = db.entities.find({}, {"_id": 0}).sort("infiltration_count", -1).limit(limit)
        items = await cursor.to_list(limit)
    else:  # trending — velocity
        cutoff = (datetime.now(timezone.utc) - timedelta(days=window_days)).isoformat()
        pipeline = [
            {"$match": {"ts": {"$gte": cutoff}}},
            {"$group": {"_id": "$slug", "hits": {"$sum": 1}}},
            {"$sort": {"hits": -1}},
            {"$limit": limit},
        ]
        agg = await db.hits.aggregate(pipeline).to_list(limit)
        slugs = [a["_id"] for a in agg]
        hits_by_slug = {a["_id"]: a["hits"] for a in agg}
        if slugs:
            ents = await db.entities.find({"slug": {"$in": slugs}}, {"_id": 0}).to_list(limit)
            ents_by_slug = {e["slug"]: e for e in ents}
            items = [ents_by_slug[s] for s in slugs if s in ents_by_slug]
            for i in items:
                i["velocity"] = hits_by_slug.get(i["slug"], 0)
        # If we don't have enough velocity data yet, pad with lifetime top
        if len(items) < limit:
            pad_needed = limit - len(items)
            already = {i["slug"] for i in items}
            pad_cursor = (
                db.entities.find({"slug": {"$nin": list(already)}}, {"_id": 0})
                .sort("infiltration_count", -1)
                .limit(pad_needed)
            )
            items.extend(await pad_cursor.to_list(pad_needed))

    return {
        "items": [
            {
                "slug": i["slug"],
                "name": i["name"],
                "entity_type": i.get("entity_type", "franchise"),
                "one_line_context": i.get("one_line_context", ""),
                "larpability": i.get("larpability", {"tier": "B"}),
                "infiltration_count": i.get("infiltration_count", 1),
                "velocity": i.get("velocity", 0),
                "trending": i.get("trending", False),
            }
            for i in items
        ]
    }


@api_router.get("/entities/search/live")
async def entity_search_live(q: str = "", limit: int = 8):
    """Autocomplete: compiled entities first, then approved seed names, then queued."""
    q = (q or "").strip()
    if not q:
        return {"items": []}
    nk = normalize_key(q)
    if not nk:
        return {"items": []}

    results = []
    seen = set()

    # 1. compiled entities (name contains q, case-insensitive)
    regex = {"$regex": re.escape(q), "$options": "i"}
    async for e in db.entities.find({"name": regex}, {"_id": 0}).limit(limit):
        if e["slug"] in seen:
            continue
        seen.add(e["slug"])
        results.append({
            "kind": "compiled",
            "slug": e["slug"],
            "name": e["name"],
            "entity_type": e.get("entity_type", ""),
            "tier": e.get("larpability", {}).get("tier", "B"),
        })

    # 2. approved (uncompiled) seed names
    if len(results) < limit:
        async for a in db.approved.find({"name": regex}, {"_id": 0}).limit(limit):
            slug = a.get("slug") or slugify(a["name"])
            if slug in seen:
                continue
            seen.add(slug)
            results.append({
                "kind": "approved",
                "slug": slug,
                "name": a["name"],
                "entity_type": a.get("entity_type", ""),
            })
            if len(results) >= limit:
                break

    # 3. queued
    if len(results) < limit:
        async for qd in db.queue.find({"name": regex}, {"_id": 0}).sort("votes", -1).limit(limit):
            slug = qd.get("slug") or slugify(qd["name"])
            if slug in seen:
                continue
            seen.add(slug)
            results.append({
                "kind": "queued",
                "slug": slug,
                "name": qd["name"],
                "votes": qd.get("votes", 1),
            })
            if len(results) >= limit:
                break

    return {"items": results[:limit]}


@api_router.post("/entities/queue")
async def entity_queue(req: QueueRequest):
    slug = req.slug or slugify(req.name)
    existing = await db.entities.find_one({"slug": slug}, {"_id": 0})
    if existing:
        return {"status": "already_compiled", "slug": slug}
    key = normalize_key(req.name) or slug
    await db.queue.update_one(
        {"key": key},
        {
            "$set": {"key": key, "name": req.name, "slug": slug, "queued_at": now_iso()},
            "$inc": {"votes": 1},
        },
        upsert=True,
    )
    return {"status": "queued", "slug": slug, "key": key}


@api_router.get("/queue")
async def queue_list(limit: int = 20):
    cursor = db.queue.find({}, {"_id": 0}).sort("votes", -1).limit(limit)
    items = await cursor.to_list(limit)
    return {"items": items}


# ---------- Sniff The Bot ----------
ARCHETYPES = [
    ("casual_fan", "Casual Fan", "knows the hits, casual about it, no strong takes"),
    ("superfan", "Superfan", "knows everything, deep cuts, over-the-top enthusiasm, quotes trivia"),
    ("new_fan", "Brand-New Fan", "just discovered it, over-excited, mixes up basic facts"),
    ("ragebaiter", "Ragebaiter", "always negative, calls it overrated, looking for a fight"),
    ("fake_fan", "Fake Fan", "pretends to know, uses generic phrases, avoids specifics, hedges a lot"),
    ("veteran", "Longtime Veteran", "been there since day one, references old stuff, name-drops eras/lore"),
]

SNIFF_QUESTIONS = [
    "What got you into them?",
    "What's your favorite thing they've done?",
    "Thoughts on their most popular work?",
    "How would you describe the fandom?",
]

SNIFF_SYSTEM = """You are writing dialogue for a minigame where the player guesses which fan-archetype is talking about a subject. Each archetype answers 4 shared questions.

STRICT RULES:
- Output ONLY valid JSON. No preamble.
- Each answer is 1-2 sentences, sounds like a real teenager in a Discord chat about this specific subject.
- Answers must be DISTINCT per archetype — the point is that a player can tell which is which from tone and specificity.
- Never break character. Never mention "archetype" or the game itself in the answer.
- The Fake Fan should use vague hedges ("yeah I've been into them for a while", "the vibes are great") and avoid specifics.
- The Superfan should drop names, years, obscure references specific to the subject.
- The Ragebaiter is negative but recognisably informed.
"""


async def compile_sniff_bot(entity_name: str) -> dict:
    arche_json = ",\n    ".join(
        f'"{k}": {{"label": "{label}", "answers": ["...", "...", "...", "..."]}}'
        for k, label, _ in ARCHETYPES
    )
    template = (
        f'{{\n  "questions": {json.dumps(SNIFF_QUESTIONS)},\n  "archetypes": {{\n    {arche_json}\n  }}\n}}'
    )
    prompt = (
        f'Subject: "{entity_name}".\n\n'
        f"For each of these archetypes:\n"
        + "\n".join(f"- {k}: {label} — {desc}" for k, label, desc in ARCHETYPES)
        + f"\n\nAnswer these {len(SNIFF_QUESTIONS)} questions in order, in the archetype's voice:\n"
        + "\n".join(f"  Q{i+1}: {q}" for i, q in enumerate(SNIFF_QUESTIONS))
        + f"\n\nReturn EXACTLY this JSON shape (fill in the answer arrays with 4 strings each):\n{template}\n\nJSON only."
    )

    if LLM_PROVIDER == "openrouter":
        if not OPENROUTER_API_KEY:
            raise HTTPException(500, "OPENROUTER_API_KEY not set")
        async with httpx.AsyncClient(timeout=90.0) as c:
            r = await c.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": SNIFF_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.7,
                    "response_format": {"type": "json_object"},
                },
            )
        if r.status_code != 200:
            raise HTTPException(502, "sniff compile failed")
        raw = r.json()["choices"][0]["message"]["content"]
    else:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"sniff-{uuid.uuid4()}",
            system_message=SNIFF_SYSTEM,
        ).with_model(LLM_PROVIDER, LLM_MODEL)
        resp = await chat.send_message(UserMessage(text=prompt))
        raw = resp if isinstance(resp, str) else str(resp)

    return _extract_json(raw)


@api_router.get("/entities/{slug}/sniff")
async def entity_sniff(slug: str):
    ent = await db.entities.find_one({"slug": slug}, {"_id": 0})
    if not ent:
        raise HTTPException(404, "Case file not compiled yet")
    existing = await db.sniff.find_one({"slug": slug}, {"_id": 0})
    if existing:
        return existing
    data = await compile_sniff_bot(ent["name"])
    doc = {
        "slug": slug,
        "name": ent["name"],
        "questions": data.get("questions", SNIFF_QUESTIONS),
        "archetypes": data.get("archetypes", {}),
        "created_at": now_iso(),
    }
    await db.sniff.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- LARP Test ----------
QUIZ_SYSTEM = """You are writing scenario-based multiple-choice questions for an infiltration test. The player is pretending to be a fan of the subject; the questions test whether they can hold their own in real conversations.

STRICT RULES:
- Output ONLY valid JSON. No preamble.
- Scenarios are conversational situations, NOT factual trivia. ("You're at a party and someone says X. You:")
- 4 options per question, exactly one is the 'convincing' one.
- Include a 1-sentence 'why' for the correct answer.
- Questions escalate in difficulty from easy to hard.
- Wrong answers should be plausible-sounding traps, not obvious jokes.
"""


async def compile_quiz(entity_name: str) -> List[dict]:
    prompt = (
        f'Subject: "{entity_name}". Write 10 scenario-based multiple-choice questions for an infiltration test.\n\n'
        'Return EXACTLY this JSON shape:\n'
        '{"questions": [\n'
        '  {"scenario": "Situation description ending in a prompt", "options": ["A", "B", "C", "D"], "correct_index": 0-3, "why": "one sentence"}\n'
        ']}\n\nExactly 10 items. JSON only.'
    )
    if LLM_PROVIDER == "openrouter":
        if not OPENROUTER_API_KEY:
            raise HTTPException(500, "OPENROUTER_API_KEY not set")
        async with httpx.AsyncClient(timeout=90.0) as c:
            r = await c.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": QUIZ_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.6,
                    "response_format": {"type": "json_object"},
                },
            )
        if r.status_code != 200:
            raise HTTPException(502, "quiz compile failed")
        raw = r.json()["choices"][0]["message"]["content"]
    else:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"quiz-{uuid.uuid4()}",
            system_message=QUIZ_SYSTEM,
        ).with_model(LLM_PROVIDER, LLM_MODEL)
        resp = await chat.send_message(UserMessage(text=prompt))
        raw = resp if isinstance(resp, str) else str(resp)

    data = _extract_json(raw)
    questions = data.get("questions", [])
    # Shuffle options so the correct answer isn't always at the same index
    for q in questions:
        opts = q.get("options", [])
        ci = q.get("correct_index", 0)
        if not opts or ci is None or ci < 0 or ci >= len(opts):
            continue
        correct_value = opts[ci]
        indices = list(range(len(opts)))
        random.shuffle(indices)
        q["options"] = [opts[i] for i in indices]
        q["correct_index"] = q["options"].index(correct_value)
    return questions


class QuizAnswers(BaseModel):
    answers: List[int]  # index selected per question


@api_router.get("/entities/{slug}/quiz")
async def entity_quiz(slug: str):
    ent = await db.entities.find_one({"slug": slug}, {"_id": 0})
    if not ent:
        raise HTTPException(404, "Case file not compiled yet")
    existing = await db.quizzes.find_one({"slug": slug}, {"_id": 0})
    if existing:
        # strip correct_index from client-visible payload
        public_qs = [
            {"scenario": q["scenario"], "options": q["options"]}
            for q in existing.get("questions", [])
        ]
        return {"slug": slug, "name": ent["name"], "questions": public_qs}
    questions = await compile_quiz(ent["name"])
    doc = {
        "slug": slug,
        "name": ent["name"],
        "questions": questions,
        "created_at": now_iso(),
    }
    await db.quizzes.insert_one(doc)
    public_qs = [{"scenario": q["scenario"], "options": q["options"]} for q in questions]
    return {"slug": slug, "name": ent["name"], "questions": public_qs}


def _verdict(score: int, total: int) -> dict:
    pct = (score / total) * 100 if total else 0
    if pct >= 80:
        return {"tier": "convincing", "label": "CONVINCING", "note": "you'd survive the fandom Discord"}
    if pct >= 50:
        return {"tier": "suspicious", "label": "SUSPICIOUS", "note": "you're passing but they're watching"}
    return {"tier": "caught", "label": "GETTING CAUGHT", "note": "the group chat has already screenshotted you"}


@api_router.post("/entities/{slug}/quiz/grade")
async def entity_quiz_grade(slug: str, payload: QuizAnswers):
    quiz = await db.quizzes.find_one({"slug": slug}, {"_id": 0})
    if not quiz:
        raise HTTPException(404, "Quiz not generated yet")
    qs = quiz.get("questions", [])
    n = min(len(qs), len(payload.answers))
    per_q = []
    score = 0
    for i in range(n):
        correct = qs[i].get("correct_index")
        picked = payload.answers[i]
        got = picked == correct
        if got:
            score += 1
        per_q.append({
            "picked": picked,
            "correct_index": correct,
            "why": qs[i].get("why", ""),
            "got_right": got,
        })
    verdict = _verdict(score, len(qs))
    return {
        "slug": slug,
        "score": score,
        "total": len(qs),
        "verdict": verdict,
        "per_question": per_q,
    }


# ---------- Admin ----------
def _check_admin(token: Optional[str]):
    if not ADMIN_TOKEN:
        raise HTTPException(500, "ADMIN_TOKEN not configured")
    if token != ADMIN_TOKEN:
        raise HTTPException(401, "Bad admin token")


@api_router.post("/admin/approve")
async def admin_approve(
    req: ApproveRequest,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _check_admin(x_admin_token)
    slug = slugify(req.slug)
    name = req.name or req.slug
    keys = set(variant_keys(name) + variant_keys(slug))
    for k in keys:
        if not k:
            continue
        await db.approved.update_one(
            {"key": k},
            {"$set": {"key": k, "slug": slug, "name": name}},
            upsert=True,
        )
    if req.auto_generate:
        case = await compile_case_file(name)
        doc = case.model_dump()
        await db.entities.update_one({"slug": doc["slug"]}, {"$set": doc}, upsert=True)
        await register_aliases(doc["slug"], name, doc["name"])
        await db.queue.delete_many({"key": {"$in": list(keys)}})
        return {"status": "approved_and_compiled", "slug": doc["slug"]}
    return {"status": "approved", "slug": slug}


@api_router.get("/admin/queue")
async def admin_queue(
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
    limit: int = 50,
):
    _check_admin(x_admin_token)
    cursor = db.queue.find({}, {"_id": 0}).sort("votes", -1).limit(limit)
    return {"items": await cursor.to_list(limit)}


# ---------- Freshness Radar ----------
FRESHNESS_STALE_DAYS = 7
FRESHNESS_SYSTEM = """You update the "Latest" section of an existing fandom case file. Your job is honesty, not filler.

RULES:
- Output ONLY valid JSON, no preamble.
- Return AT MOST 3 items. Include only ACTUAL, verifiable developments (new releases, tour announcements, awards, viral moments, controversies, cast changes, season/expansion drops, breakups, deaths).
- If nothing significant has happened, return an empty items array AND set quiet_note to an in-voice line like "Nothing major this week — fandom is between drops."
- Each item: {"date": "YYYY-MM", "headline": "...", "link": "url or null"}.
"""


async def _llm_freshness(entity_name: str, entity_type: str, current_latest: List[dict]) -> dict:
    known = json.dumps(current_latest[:5]) if current_latest else "[]"
    prompt = (
        f'Subject: "{entity_name}" ({entity_type}). '
        f"Compare against the currently listed Latest items: {known}. "
        "Report any GENUINELY new significant developments. Do not repeat what's already listed. "
        "If nothing has meaningfully changed, honestly say so.\n\n"
        'Return exactly: {"items": [{"date":"YYYY-MM","headline":"...","link":"url or null"}], "quiet_note": "line or null"}\n\nJSON only.'
    )
    if LLM_PROVIDER == "openrouter":
        if not OPENROUTER_API_KEY:
            raise HTTPException(500, "OPENROUTER_API_KEY not set")
        async with httpx.AsyncClient(timeout=60.0) as c:
            r = await c.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": FRESHNESS_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"},
                },
            )
        if r.status_code != 200:
            raise HTTPException(502, "freshness compile failed")
        raw = r.json()["choices"][0]["message"]["content"]
    else:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"freshness-{uuid.uuid4()}",
            system_message=FRESHNESS_SYSTEM,
        ).with_model(LLM_PROVIDER, LLM_MODEL)
        resp = await chat.send_message(UserMessage(text=prompt))
        raw = resp if isinstance(resp, str) else str(resp)
    return _extract_json(raw)


@api_router.get("/admin/freshness/scan")
async def admin_freshness_scan(
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
    days: int = FRESHNESS_STALE_DAYS,
):
    """List active entities whose latest section may be stale (age > days AND velocity > 0)."""
    _check_admin(x_admin_token)
    cutoff_created = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    # active = has hits in the last `days` window
    cutoff_hits = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    active_pipeline = [
        {"$match": {"ts": {"$gte": cutoff_hits}}},
        {"$group": {"_id": "$slug", "hits": {"$sum": 1}}},
    ]
    active = {a["_id"]: a["hits"] for a in await db.hits.aggregate(active_pipeline).to_list(500)}

    stale = []
    async for e in db.entities.find({}, {"_id": 0}):
        slug = e["slug"]
        last_check = e.get("last_freshness_check") or e.get("created_at", "")
        if last_check > cutoff_created:
            continue
        velocity = active.get(slug, 0)
        if velocity == 0:
            continue
        stale.append(
            {
                "slug": slug,
                "name": e["name"],
                "entity_type": e.get("entity_type", ""),
                "velocity": velocity,
                "last_check": last_check,
                "latest_count": len(e.get("latest", [])),
            }
        )
    stale.sort(key=lambda x: x["velocity"], reverse=True)
    return {"items": stale, "cutoff_days": days}


@api_router.post("/admin/freshness/refresh/{slug}")
async def admin_freshness_refresh(
    slug: str,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _check_admin(x_admin_token)
    ent = await db.entities.find_one({"slug": slug}, {"_id": 0})
    if not ent:
        raise HTTPException(404, "Entity not found")
    data = await _llm_freshness(ent["name"], ent.get("entity_type", ""), ent.get("latest", []))
    new_items = data.get("items", []) or []
    quiet = data.get("quiet_note")
    # Merge (append new headlines that aren't already there) — dedupe on headline text
    existing_headlines = {i.get("headline") for i in ent.get("latest", [])}
    merged = ent.get("latest", []).copy()
    added = []
    for item in new_items:
        if not item.get("headline"):
            continue
        if item["headline"] in existing_headlines:
            continue
        merged.insert(0, item)
        added.append(item)
    # Cap at 6 items so it stays lean
    merged = merged[:6]
    update = {
        "latest": merged,
        "latest_quiet_note": quiet if not merged else None,
        "last_freshness_check": now_iso(),
    }
    await db.entities.update_one({"slug": slug}, {"$set": update})
    return {
        "slug": slug,
        "added": added,
        "quiet_note": quiet,
        "checked_at": update["last_freshness_check"],
    }


# ---------- Content Health ----------
class BulkApprove(BaseModel):
    slugs: List[str]
    auto_generate: bool = False


class BulkPrune(BaseModel):
    slugs: List[str]


class RejectQueue(BaseModel):
    keys: List[str]


@api_router.get("/admin/stats")
async def admin_stats(
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _check_admin(x_admin_token)
    total_entities = await db.entities.count_documents({})
    total_queued = await db.queue.count_documents({})
    total_approved_keys = await db.approved.count_documents({})
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_compiles = await db.entities.count_documents({"created_at": {"$gte": week_ago}})
    recent_hits = await db.hits.count_documents({"ts": {"$gte": week_ago}})
    # zero traffic candidates: age > 7d AND no hits in last 7d
    active_pipeline = [
        {"$match": {"ts": {"$gte": week_ago}}},
        {"$group": {"_id": "$slug"}},
    ]
    active_slugs = {a["_id"] for a in await db.hits.aggregate(active_pipeline).to_list(1000)}
    zero_traffic = 0
    stale_active = 0
    async for e in db.entities.find({"created_at": {"$lt": week_ago}}, {"_id": 0, "slug": 1, "last_freshness_check": 1}):
        if e["slug"] not in active_slugs:
            zero_traffic += 1
        else:
            last_check = e.get("last_freshness_check") or ""
            if last_check < week_ago:
                stale_active += 1
    return {
        "total_entities": total_entities,
        "total_queued": total_queued,
        "total_approved_keys": total_approved_keys,
        "recent_compiles_7d": recent_compiles,
        "recent_hits_7d": recent_hits,
        "zero_traffic_count": zero_traffic,
        "stale_active_count": stale_active,
    }


@api_router.get("/admin/entities")
async def admin_entities(
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
    filter: str = "all",
    limit: int = 100,
):
    _check_admin(x_admin_token)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    if filter == "zero_traffic":
        active_pipeline = [
            {"$match": {"ts": {"$gte": week_ago}}},
            {"$group": {"_id": "$slug"}},
        ]
        active_slugs = {a["_id"] for a in await db.hits.aggregate(active_pipeline).to_list(1000)}
        cursor = db.entities.find(
            {"created_at": {"$lt": week_ago}}, {"_id": 0}
        ).sort("infiltration_count", 1).limit(limit * 3)
        docs = await cursor.to_list(limit * 3)
        docs = [d for d in docs if d["slug"] not in active_slugs][:limit]
    else:
        cursor = db.entities.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(limit)

    return {
        "items": [
            {
                "slug": d["slug"],
                "name": d["name"],
                "entity_type": d.get("entity_type", ""),
                "created_at": d.get("created_at"),
                "last_freshness_check": d.get("last_freshness_check"),
                "infiltration_count": d.get("infiltration_count", 0),
                "tier": d.get("larpability", {}).get("tier", "B"),
            }
            for d in docs
        ]
    }


@api_router.post("/admin/approve/bulk")
async def admin_approve_bulk(
    req: BulkApprove,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _check_admin(x_admin_token)
    approved, generated = [], []
    for name in req.slugs:
        slug = slugify(name)
        keys = set(variant_keys(name) + variant_keys(slug))
        for k in keys:
            if not k:
                continue
            await db.approved.update_one(
                {"key": k},
                {"$set": {"key": k, "slug": slug, "name": name}},
                upsert=True,
            )
        await db.queue.delete_many({"key": {"$in": list(keys)}})
        approved.append(slug)
        if req.auto_generate:
            try:
                case = await compile_case_file(name)
                doc = case.model_dump()
                await db.entities.update_one({"slug": doc["slug"]}, {"$set": doc}, upsert=True)
                await register_aliases(doc["slug"], name, doc["name"])
                generated.append(doc["slug"])
            except Exception as e:
                logger.error(f"bulk auto_generate failed for {name}: {e}")
    return {"approved": approved, "generated": generated}


@api_router.post("/admin/queue/reject")
async def admin_queue_reject(
    req: RejectQueue,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _check_admin(x_admin_token)
    if not req.keys:
        return {"deleted": 0}
    result = await db.queue.delete_many({"key": {"$in": req.keys}})
    return {"deleted": result.deleted_count}


@api_router.post("/admin/prune")
async def admin_prune(
    req: BulkPrune,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _check_admin(x_admin_token)
    if not req.slugs:
        return {"deleted": 0}
    ent_del = await db.entities.delete_many({"slug": {"$in": req.slugs}})
    await db.aliases.delete_many({"canonical_slug": {"$in": req.slugs}})
    await db.sniff.delete_many({"slug": {"$in": req.slugs}})
    await db.quizzes.delete_many({"slug": {"$in": req.slugs}})
    await db.hits.delete_many({"slug": {"$in": req.slugs}})
    return {"deleted": ent_del.deleted_count}


@api_router.get("/admin/ping")
async def admin_ping(
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    _check_admin(x_admin_token)
    return {"ok": True}


# ---------- Wire up ----------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
