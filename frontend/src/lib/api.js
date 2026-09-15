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

export const slugify = (s) =>
  s
    .toString()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
