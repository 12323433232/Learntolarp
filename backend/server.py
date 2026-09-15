from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

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


# ---------- Helpers ----------
def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")[:80]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    tier: str  # S | A | B | C
    difficulty: str  # easy | moderate | hard | nightmare
    reasoning: str


class CaseFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    name: str
    entity_type: str  # person | group | franchise | era
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


class GenerateRequest(BaseModel):
    query: str


class QueueRequest(BaseModel):
    name: str
    slug: Optional[str] = None


# ---------- LLM ----------
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "anthropic")
LLM_MODEL = os.environ.get("LLM_MODEL", "claude-sonnet-4-6")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

SYSTEM_PROMPT = """You are the case-file compiler for learntolarp.com — a reference tool for teenagers (13-17) who want to convincingly join a conversation about any fandom/person/franchise they don't know.

Your job: fill a STRICT JSON template with genuinely useful, real, verifiable information. Tone is Discord/gaming-adjacent — plain, active, direct. Not academic. Not sycophantic. Not corny.

RULES:
- Output ONLY valid JSON. No markdown. No preamble. No trailing commentary.
- All quotes must be REAL things the person/artist/character has actually said in interviews, on stage, in-story, or in verifiable public statements. NEVER lyrics. NEVER invented quotes. If you cannot cite 3+ real quotes, return fewer.
- Facts must be verifiable. Include a source URL where possible (Wikipedia, official site, major outlet).
- The "dangerous_territory" field is ONE debate inside the fandom that has no safe answer — flag it honestly.
- "latest" should reflect recent activity you're confident about. If nothing significant is happening, return an empty array and set "latest_quiet_note" to an in-voice line like "Nothing major this week — fandom is between drops."
- "cross_refs" should list 4-8 related entities a reader might want next (collaborators, rivals, franchises, contemporaries). Use plain slugs (lowercase, dashes).
- Never write in the site's opinion. "fans_say"/"critics_say" is REPORTED sentiment.
- Balance: 70% real utility, 30% wink. The infiltration framing is a wink, not the whole vibe.
"""

TEMPLATE_INSTRUCTION = """Return a JSON object with EXACTLY this shape (no extra keys, no missing keys):

{
  "name": "canonical name",
  "entity_type": "person|group|franchise|era",
  "one_line_context": "one plain-language sentence explaining who/what this is",
  "larpability": {
    "tier": "S|A|B|C",
    "difficulty": "easy|moderate|hard|nightmare",
    "reasoning": "one sentence on why this tier"
  },
  "trending": true or false,
  "first_larped_by": "a short pseudonymous handle like 'Agent-K13' or 'Analyst-04'",
  "briefing_5sec": ["line 1", "line 2", "line 3"],
  "fact": [
    {"label": "FORMED", "value": "...", "source": "url or null"},
    {"label": "ORIGIN", "value": "...", "source": "url"},
    {"label": "DEFINING WORK", "value": "...", "source": "url"},
    {"label": "CURRENT STATUS", "value": "...", "source": "url"},
    {"label": "KEY PEOPLE", "value": "...", "source": "url"}
  ],
  "culture": {
    "nicknames": ["what fans call them", "another one"],
    "insider_terms": [
      {"term": "term used", "meaning": "what it means to fans"}
    ],
    "must_say": "one opinion/take fans will nod at",
    "never_say": "one take that will get you dogpiled",
    "running_debates": ["debate 1", "debate 2"],
    "dangerous_territory": "the one topic with no safe answer"
  },
  "quotes": [
    {
      "speaker": "name of who said it",
      "quote": "the actual real quote",
      "context": "brief context: where/when",
      "reason": "why this quote is included (can be 'infamous', 'defining', 'funny', 'sets their tone')"
    }
  ],
  "perception": {
    "fans_pct": 0-100,
    "critics_pct": 0-100,
    "fans_say": [{"point": "reported fan take", "source": "url"}],
    "critics_say": [{"point": "reported critic take", "source": "url"}]
  },
  "latest": [
    {"date": "YYYY-MM", "headline": "...", "link": "url"}
  ],
  "latest_quiet_note": null or "in-voice line if latest is empty",
  "starters": {
    "safe": ["something anyone can say", "another"],
    "medium": ["something a semi-fan would say"],
    "risky": ["something only a deep fan should attempt"]
  },
  "cross_refs": [
    {"name": "Related Entity", "slug": "related-entity"}
  ],
  "mission_note": "one honest in-voice line reminding this is for fun and not a replacement for real fandom",
  "sources": ["url1", "url2", "url3"]
}

Aim for: 3-5 quotes, 4-6 cross_refs, 2 items in each starters tier, 5 fact rows, 3+ insider terms."""


def _extract_json(text: str) -> Dict[str, Any]:
    """Pull the first {...} JSON object out of the LLM response."""
    # Strip common markdown fences
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    # Find first { and matching last }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(text[start : end + 1])


async def generate_case_file(query: str) -> CaseFile:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")

    session_id = f"casefile-{uuid.uuid4()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=SYSTEM_PROMPT,
    ).with_model(LLM_PROVIDER, LLM_MODEL)

    user_prompt = (
        f'Compile the case file for: "{query}".\n\n'
        f"{TEMPLATE_INSTRUCTION}\n\n"
        f"Remember: JSON ONLY. No explanation before or after."
    )

    response = await chat.send_message(UserMessage(text=user_prompt))
    raw = response if isinstance(response, str) else str(response)

    try:
        data = _extract_json(raw)
    except Exception as e:
        logger.error(f"JSON parse failed: {e} | raw: {raw[:400]}")
        raise HTTPException(502, "Failed to parse case file from LLM")

    slug = slugify(data.get("name", query))
    case = CaseFile(
        slug=slug,
        name=data.get("name", query),
        entity_type=data.get("entity_type", "franchise"),
        one_line_context=data.get("one_line_context", ""),
        larpability=Larpability(**data.get("larpability", {"tier": "B", "difficulty": "moderate", "reasoning": ""})),
        trending=bool(data.get("trending", False)),
        first_larped_by=data.get("first_larped_by", "Analyst-00"),
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
    return case


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"service": "learntolarp", "status": "ok"}


@api_router.post("/entities/generate", response_model=CaseFile)
async def entity_generate(req: GenerateRequest):
    query = req.query.strip()
    if not query:
        raise HTTPException(400, "Empty query")
    slug = slugify(query)

    existing = await db.entities.find_one({"slug": slug}, {"_id": 0})
    if existing:
        # bump infiltration counter, return cached
        await db.entities.update_one(
            {"slug": slug}, {"$inc": {"infiltration_count": 1}}
        )
        existing["infiltration_count"] = existing.get("infiltration_count", 1) + 1
        return CaseFile(**existing)

    case = await generate_case_file(query)
    doc = case.model_dump()
    await db.entities.insert_one(doc)
    # remove from queue if it was requested
    await db.queue.delete_many({"slug": slug})
    return case


@api_router.get("/entities/{slug}", response_model=CaseFile)
async def entity_get(slug: str):
    doc = await db.entities.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Case file not compiled yet")
    return CaseFile(**doc)


@api_router.get("/entities")
async def entity_list(limit: int = 12, sort: str = "trending"):
    """List entities: sort=trending (by infiltration_count) or sort=recent (by created_at)."""
    sort_field = "infiltration_count" if sort == "trending" else "created_at"
    cursor = db.entities.find({}, {"_id": 0}).sort(sort_field, -1).limit(limit)
    items = await cursor.to_list(limit)
    return {
        "items": [
            {
                "slug": i["slug"],
                "name": i["name"],
                "entity_type": i.get("entity_type", "franchise"),
                "one_line_context": i.get("one_line_context", ""),
                "larpability": i.get("larpability", {"tier": "B"}),
                "infiltration_count": i.get("infiltration_count", 1),
                "trending": i.get("trending", False),
            }
            for i in items
        ]
    }


@api_router.post("/entities/queue")
async def entity_queue(req: QueueRequest):
    slug = req.slug or slugify(req.name)
    existing = await db.entities.find_one({"slug": slug}, {"_id": 0})
    if existing:
        return {"status": "already_compiled", "slug": slug}
    await db.queue.update_one(
        {"slug": slug},
        {
            "$set": {"name": req.name, "slug": slug, "queued_at": now_iso()},
            "$inc": {"votes": 1},
        },
        upsert=True,
    )
    return {"status": "queued", "slug": slug}


@api_router.get("/queue")
async def queue_list(limit: int = 20):
    cursor = db.queue.find({}, {"_id": 0}).sort("votes", -1).limit(limit)
    items = await cursor.to_list(limit)
    return {"items": items}


# ---------- Wire up ----------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
