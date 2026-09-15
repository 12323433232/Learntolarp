"""Backend tests for learntolarp iteration 2."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://case-file-4.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "learntolarp-admin-dev-token-change-me"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ---- Root / provider info ----
def test_root_provider(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data["service"] == "learntolarp"
    assert data["status"] == "ok"
    assert "provider" in data and "model" in data
    assert data["provider"] == "anthropic"


# ---- Autocomplete ----
def test_search_live_returns_items(s):
    r = s.get(f"{API}/entities/search/live", params={"q": "beat"})
    assert r.status_code == 200
    items = r.json()["items"]
    assert isinstance(items, list)
    # Beatles should be in approved seed at minimum
    kinds = {i["kind"] for i in items}
    assert kinds.issubset({"compiled", "approved", "queued"})
    assert any("beat" in i["name"].lower() for i in items)


def test_search_live_empty(s):
    r = s.get(f"{API}/entities/search/live", params={"q": ""})
    assert r.status_code == 200
    assert r.json()["items"] == []


# ---- Alias resolution (Beatles) ----
def test_beatles_alias_resolution(s):
    # Compile "The Beatles" first (approved seed). May take LLM time.
    r1 = s.post(f"{API}/entities/generate", json={"query": "The Beatles"}, timeout=120)
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    # If it responds with queued something is wrong
    assert d1.get("status") != "queued", "The Beatles should be approved-seeded"
    slug1 = d1["slug"]
    count1 = d1.get("infiltration_count", 1)

    # "Beatles" (no The) - should alias to same slug
    r2 = s.post(f"{API}/entities/generate", json={"query": "Beatles"}, timeout=30)
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2.get("status") != "queued"
    assert d2["slug"] == slug1
    assert d2["infiltration_count"] > count1

    # "beatles" lowercase
    r3 = s.post(f"{API}/entities/generate", json={"query": "beatles"}, timeout=30)
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["slug"] == slug1

    # "beatle" singular - variant_keys should handle
    r4 = s.post(f"{API}/entities/generate", json={"query": "beatle"}, timeout=30)
    assert r4.status_code == 200
    d4 = r4.json()
    # This should NOT go to queue if variant_keys work
    assert d4.get("status") != "queued", f"beatle should alias to the-beatles, got: {d4}"
    assert d4["slug"] == slug1


# ---- Non-approved goes to queue (no LLM call, fast) ----
def test_unknown_query_goes_to_queue_fast(s):
    unique = f"SomeUnknownFakeThing{int(time.time())}"
    t0 = time.time()
    r = s.post(f"{API}/entities/generate", json={"query": unique}, timeout=10)
    elapsed = time.time() - t0
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "queued"
    assert data.get("votes", 0) >= 1
    assert elapsed < 3.0, f"Queued response too slow ({elapsed}s), might have hit LLM"

    # Second call increments votes
    r2 = s.post(f"{API}/entities/generate", json={"query": unique}, timeout=10)
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["status"] == "queued"
    assert d2["votes"] >= data["votes"] + 1


# ---- Alias-only slug GET resolves ----
def test_get_by_alias_slug(s):
    # Ensure Beatles compiled first
    s.post(f"{API}/entities/generate", json={"query": "The Beatles"}, timeout=120)
    r = s.get(f"{API}/entities/beatles")
    assert r.status_code == 200
    data = r.json()
    assert "beatles" in data["slug"].lower()


def test_get_unknown_slug_404(s):
    r = s.get(f"{API}/entities/absolutely-not-a-thing-xyz-99999")
    assert r.status_code == 404


# ---- Admin routes ----
def test_admin_approve_requires_token(s):
    r = s.post(f"{API}/admin/approve", json={"slug": "test-thing"})
    assert r.status_code == 401


def test_admin_approve_with_token(s):
    r = s.post(
        f"{API}/admin/approve",
        json={"slug": "test-thing-approve", "name": "Test Thing Approve"},
        headers={"X-Admin-Token": ADMIN_TOKEN},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "approved"


def test_admin_queue_requires_token(s):
    r = s.get(f"{API}/admin/queue")
    assert r.status_code == 401
    r2 = s.get(f"{API}/admin/queue", headers={"X-Admin-Token": ADMIN_TOKEN})
    assert r2.status_code == 200
    assert isinstance(r2.json()["items"], list)


# ---- Explicit queue endpoint still works ----
def test_explicit_queue_endpoint(s):
    unique = f"ExplicitQueueThing{int(time.time())}"
    r = s.post(f"{API}/entities/queue", json={"name": unique})
    assert r.status_code == 200
    d = r.json()
    assert d["status"] in ("queued", "already_compiled")


def test_public_queue_list(s):
    r = s.get(f"{API}/queue")
    assert r.status_code == 200
    assert isinstance(r.json()["items"], list)


# ---- Entities list ----
def test_entities_list(s):
    r = s.get(f"{API}/entities", params={"sort": "trending", "limit": 12})
    assert r.status_code == 200
    assert isinstance(r.json()["items"], list)
