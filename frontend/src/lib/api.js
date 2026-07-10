import axios from "axios";
import supabase from "./supabase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api"
});

const CACHE_TTL_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 600;
const cache = new Map();

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetry = (error, attempt) => {
  const status = error?.response?.status;
  return attempt < MAX_RETRIES && (!status || status >= 500 || status === 408 || error?.code === "ERR_NETWORK" || error?.message === "Network Error");
};

const requestWithRetry = async (method, url, config = {}, options = {}) => {
  const cacheKey = options.cacheKey || `${method.toUpperCase()}:${url}:${JSON.stringify(config.params || {})}`;
  const cached = options.useCache !== false ? cache.get(cacheKey) : null;

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await api.request({ method, url, ...config });
      if (options.useCache !== false) {
        cache.set(cacheKey, { timestamp: Date.now(), value: response });
      }
      return response;
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error, attempt)) throw error;
      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
};

const invalidateCache = (prefix) => {
  for (const key of cache.keys()) {
    if (key.includes(prefix)) {
      cache.delete(key);
    }
  }
};

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Erro ignorado no signOut:", err);
      }
      
      localStorage.clear(); 
      sessionStorage.clear();

      if (window.location.pathname !== "/") { 
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ─── Categories ───────────────────────────────────────────────

export const getCategories    = ()        => requestWithRetry("get", "/categories").then(r => r.data);
export const getAllCategories  = ()        => requestWithRetry("get", "/categories/all").then(r => r.data);
export const createCategory   = (data)    => { invalidateCache("/categories"); return api.post("/categories", data).then(r => r.data); };
export const updateCategory   = (id, data)=> { invalidateCache("/categories"); return api.put(`/categories/${id}`, data).then(r => r.data); };
export const deleteCategory   = (id)      => { invalidateCache("/categories"); return api.delete(`/categories/${id}`).then(r => r.data); };

// ─── Transactions ─────────────────────────────────────────────

export const getTransactions  = (params)  => requestWithRetry("get", "/transactions", { params }, { cacheKey: `transactions:${JSON.stringify(params || {})}` }).then(r => r.data);
export const createTransaction= (data)    => { invalidateCache("/transactions"); return api.post("/transactions", data).then(r => r.data); };
export const updateTransaction= (id, data)=> { invalidateCache("/transactions"); return api.put(`/transactions/${id}`, data).then(r => r.data); };
export const deleteTransaction= (id)      => { invalidateCache("/transactions"); return api.delete(`/transactions/${id}`).then(r => r.data); };
export const confirmTransaction=(id)      => { invalidateCache("/transactions"); return api.patch(`/transactions/${id}/confirm`).then(r => r.data); };

// ─── Recurrences ──────────────────────────────────────────────

export const getRecurrences   = ()        => requestWithRetry("get", "/recurrences").then(r => r.data);
export const createRecurrence = (data)    => { invalidateCache("/recurrences"); return api.post("/recurrences", data).then(r => r.data); };
export const deleteRecurrence = (id)      => { invalidateCache("/recurrences"); return api.delete(`/recurrences/${id}`).then(r => r.data); };
export const generateRecurrence=(id, body)=> { invalidateCache("/recurrences"); return api.post(`/recurrences/${id}/generate`, body).then(r => r.data); };
export const updateRecurrence = (id, data) => { invalidateCache("/recurrences"); return api.put(`/recurrences/${id}`, data).then(r => r.data); };

// ─── Goals ────────────────────────────────────────────────────

export const getGoals         = (params)  => requestWithRetry("get", "/goals", { params }, { cacheKey: `goals:${JSON.stringify(params || {})}` }).then(r => r.data);
export const createGoal       = (data)    => { invalidateCache("/goals"); return api.post("/goals", data).then(r => r.data); };
export const updateGoal       = (id, data)=> { invalidateCache("/goals"); return api.put(`/goals/${id}`, data).then(r => r.data); };
export const deleteGoal       = (id)      => { invalidateCache("/goals"); return api.delete(`/goals/${id}`).then(r => r.data); };

// ─── Reports ──────────────────────────────────────────────────

export const getReport        = (params)  => requestWithRetry("get", "/reports/summary", { params }, { cacheKey: `report:${JSON.stringify(params || {})}` }).then(r => r.data);