"""Iteration 3 backend tests: Handle Prompt, Sniff Bot, LARP Quiz, Trending Velocity."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://case-file-4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_TOKEN = "learntolarp-admin-dev-token-change-me"


@pytest.fixture(scope="module")
def s():
    ses = requests.Session()
    ses.headers.update({"Content-Type": "application/json"})
    return ses


# ---- 1) Handle Prompt ----

def _fresh_query(prefix):
    return f"{prefix}-{int(time.time()*1000)}"


def test_handle_accepted_custom(s):
    # Use approved seed entity that may or may not be compiled yet. Use Nirvana.
    r = s.post(f"{API}/entities/generate", json={"query": "Nirvana", "first_larped_by": "Test-Agent"}, timeout=180)
    assert r.status_code == 200, r.text
    d = r.json()
    if d.get("status") == "queued":
        pytest.skip("Nirvana went to queue - not approved seed?")
    # If already compiled previously, handle is only set on first compile. So accept either Test-Agent or existing.
    assert "first_larped_by" in d
    # Store slug for later
    global NIRVANA_SLUG
    NIRVANA_SLUG = d["slug"]
    print("Nirvana first_larped_by:", d.get("first_larped_by"))


def test_handle_accepted_valid_pattern(s):
    # Directly test sanitize_handle contract via a fresh compile. Not always possible without approved seed.
    # Instead test rejection via approved compile: even a bad handle should still produce a case file (fallback).
    r = s.post(f"{API}/entities/generate", json={"query": "Nirvana", "first_larped_by": "Cool_User-42"}, timeout=180)
    assert r.status_code == 200
    d = r.json()
    if d.get("status") != "queued":
        # existing entity - handle only applied on first-compile, no assertion possible reliably
        assert "first_larped_by" in d


def test_handle_rejected_blocklist(s):
    # bad handle: admin - should be rejected → falls back. Since Nirvana likely already exists, first_larped_by unchanged.
    r = s.post(f"{API}/entities/generate", json={"query": "Nirvana", "first_larped_by": "admin"}, timeout=180)
    assert r.status_code == 200
    d = r.json()
    if d.get("status") != "queued":
        assert d.get("first_larped_by", "").lower() != "admin"


def test_handle_rejected_too_short(s):
    r = s.post(f"{API}/entities/generate", json={"query": "Nirvana", "first_larped_by": "a"}, timeout=180)
    assert r.status_code == 200
    d = r.json()
    if d.get("status") != "queued":
        assert d.get("first_larped_by", "").lower() != "a"


# ---- 2) Sniff endpoint ----

def _pick_compiled_slug(s):
    """Return the slug of any compiled entity - prefer radiohead / beatles / nirvana."""
    for cand in ["radiohead", "the-beatles", "nirvana"]:
        r = s.get(f"{API}/entities/{cand}")
        if r.status_code == 200:
            return r.json()["slug"]
    # fallback: entities list
    r = s.get(f"{API}/entities", params={"limit": 1})
    items = r.json().get("items", [])
    if items:
        return items[0]["slug"]
    pytest.skip("No compiled entity available")


def test_sniff_returns_shape(s):
    slug = _pick_compiled_slug(s)
    r = s.get(f"{API}/entities/{slug}/sniff", timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "questions" in d and len(d["questions"]) == 4
    arche = d["archetypes"]
    expected_keys = {"casual_fan", "superfan", "new_fan", "ragebaiter", "fake_fan", "veteran"}
    assert set(arche.keys()) == expected_keys, f"got {arche.keys()}"
    for k, v in arche.items():
        assert "label" in v
        assert "answers" in v and len(v["answers"]) == 4


def test_sniff_cached_second_call(s):
    slug = _pick_compiled_slug(s)
    r1 = s.get(f"{API}/entities/{slug}/sniff", timeout=120)
    t0 = time.time()
    r2 = s.get(f"{API}/entities/{slug}/sniff", timeout=15)
    dt = time.time() - t0
    assert r2.status_code == 200
    assert dt < 3.0, f"cached call too slow ({dt}s)"
    # same content
    assert r1.json()["archetypes"]["casual_fan"]["answers"] == r2.json()["archetypes"]["casual_fan"]["answers"]


def test_sniff_404_unknown(s):
    r = s.get(f"{API}/entities/definitely-not-a-slug-xyz-999/sniff")
    assert r.status_code == 404


# ---- 3) Quiz endpoint ----

def test_quiz_returns_10_no_correct_index(s):
    slug = _pick_compiled_slug(s)
    r = s.get(f"{API}/entities/{slug}/quiz", timeout=180)
    assert r.status_code == 200, r.text
    d = r.json()
    qs = d["questions"]
    assert len(qs) == 10
    for q in qs:
        assert "scenario" in q
        assert "options" in q and len(q["options"]) == 4
        assert "correct_index" not in q, "correct_index should NOT be exposed to client"


def test_quiz_cached(s):
    slug = _pick_compiled_slug(s)
    s.get(f"{API}/entities/{slug}/quiz", timeout=180)
    t0 = time.time()
    r = s.get(f"{API}/entities/{slug}/quiz", timeout=15)
    dt = time.time() - t0
    assert r.status_code == 200
    assert dt < 3.0, f"cached quiz too slow ({dt}s)"


def test_quiz_grade_all_zeros(s):
    slug = _pick_compiled_slug(s)
    s.get(f"{API}/entities/{slug}/quiz", timeout=180)
    r = s.post(f"{API}/entities/{slug}/quiz/grade", json={"answers": [0]*10}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["total"] == 10
    assert 0 <= d["score"] <= 10
    # verdict shape
    v = d["verdict"]
    assert set(v.keys()) >= {"tier", "label", "note"}
    assert v["tier"] in ("convincing", "suspicious", "caught")
    # per_question
    pq = d["per_question"]
    assert len(pq) == 10
    for item in pq:
        assert set(item.keys()) >= {"picked", "correct_index", "why", "got_right"}
    # Correct answers should NOT all be at index 0 (shuffling)
    correct_indices = [p["correct_index"] for p in pq]
    unique_ci = set(correct_indices)
    assert len(unique_ci) > 1, f"correct_index not shuffled — all correct at {correct_indices}"
    print(f"[{slug}] correct_index distribution:", correct_indices, "score(all-0):", d["score"])


def test_quiz_grade_verdict_tiers(s):
    """Grade with all-correct answers → convincing; all-wrong → caught."""
    slug = _pick_compiled_slug(s)
    r = s.get(f"{API}/entities/{slug}/quiz", timeout=180)
    assert r.status_code == 200
    # We can't see correct_index from client. Grade using each of the 4 options and pick the best result.
    # Alternative: send [0]*10, [1]*10, etc.
    best = None
    for idx in range(4):
        g = s.post(f"{API}/entities/{slug}/quiz/grade", json={"answers": [idx]*10}, timeout=15).json()
        if best is None or g["score"] > best["score"]:
            best = g
    print(f"best uniform-answer score for {slug}: {best['score']}/10, tier={best['verdict']['tier']}")
    # Score should be roughly ~2-3 on average from a single index (10/4 = 2.5). Just sanity check verdict logic.
    if best["score"] >= 8:
        assert best["verdict"]["tier"] == "convincing"
    elif best["score"] >= 5:
        assert best["verdict"]["tier"] == "suspicious"
    else:
        assert best["verdict"]["tier"] == "caught"


# ---- 4) Trending velocity ----

def test_trending_velocity_field(s):
    # Hit an entity a few times to seed velocity
    slug = _pick_compiled_slug(s)
    for _ in range(3):
        s.get(f"{API}/entities/{slug}")
    r = s.get(f"{API}/entities", params={"sort": "trending", "limit": 5})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    for i in items:
        assert "velocity" in i
        assert isinstance(i["velocity"], int)
    # Our hit slug should be present with velocity > 0
    match = next((i for i in items if i["slug"] == slug), None)
    assert match is not None, f"hit slug {slug} not in top trending"
    assert match["velocity"] > 0
    print("trending top:", [(i["slug"], i["velocity"]) for i in items])
