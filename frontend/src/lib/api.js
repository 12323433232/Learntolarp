import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const generateEntity = (query, first_larped_by) =>
  api.post("/entities/generate", { query, first_larped_by }).then((r) => r.data);

export const fetchEntity = (slug) =>
  api.get(`/entities/${slug}`).then((r) => r.data);

export const listEntities = (sort = "trending", limit = 12) =>
  api.get(`/entities?sort=${sort}&limit=${limit}`).then((r) => r.data);

export const queueEntity = (name, slug) =>
  api.post("/entities/queue", { name, slug }).then((r) => r.data);

export const fetchQueue = () => api.get("/queue").then((r) => r.data);

export const searchLive = (q) =>
  api.get(`/entities/search/live?q=${encodeURIComponent(q)}`).then((r) => r.data);

// ---------- Admin ----------
const adminHeaders = (token) => ({ headers: { "X-Admin-Token": token } });

export const adminPing = (token) =>
  api.get("/admin/ping", adminHeaders(token)).then((r) => r.data);

export const adminStats = (token) =>
  api.get("/admin/stats", adminHeaders(token)).then((r) => r.data);

export const adminQueue = (token) =>
  api.get("/admin/queue", adminHeaders(token)).then((r) => r.data);

export const adminApproveBulk = (token, slugs, auto_generate = false) =>
  api.post("/admin/approve/bulk", { slugs, auto_generate }, adminHeaders(token)).then((r) => r.data);

export const adminQueueReject = (token, keys) =>
  api.post("/admin/queue/reject", { keys }, adminHeaders(token)).then((r) => r.data);

export const adminEntities = (token, filter = "all") =>
  api.get(`/admin/entities?filter=${filter}`, adminHeaders(token)).then((r) => r.data);

export const adminPrune = (token, slugs) =>
  api.post("/admin/prune", { slugs }, adminHeaders(token)).then((r) => r.data);

export const adminFreshnessScan = (token, days = 7) =>
  api.get(`/admin/freshness/scan?days=${days}`, adminHeaders(token)).then((r) => r.data);

export const adminFreshnessRefresh = (token, slug) =>
  api.post(`/admin/freshness/refresh/${slug}`, {}, adminHeaders(token)).then((r) => r.data);

export const slugify = (s) =>
  s
    .toString()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
