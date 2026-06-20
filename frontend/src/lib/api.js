import axios from "axios";
import * as local from "./localStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api"
});

const MODE_KEY = "finapp_mode"; // "server" | "local"

export const getMode = () => localStorage.getItem(MODE_KEY) || "server";
export const setMode = (mode) => localStorage.setItem(MODE_KEY, mode);
export const isLocalMode = () => getMode() === "local";

// ─── Categories ───────────────────────────────────────────────

export const getCategories = (...args) =>
  isLocalMode() ? local.getCategories(...args) : api.get("/categories").then(r => r.data);

export const getAllCategories = (...args) =>
  isLocalMode() ? local.getAllCategories(...args) : api.get("/categories/all").then(r => r.data);

export const createCategory = (data) =>
  isLocalMode() ? local.createCategory(data) : api.post("/categories", data).then(r => r.data);

export const updateCategory = (id, data) =>
  isLocalMode() ? local.updateCategory(id, data) : api.put(`/categories/${id}`, data).then(r => r.data);

export const deleteCategory = (id) =>
  isLocalMode() ? local.deleteCategory(id) : api.delete(`/categories/${id}`).then(r => r.data);

// ─── Transactions ─────────────────────────────────────────────

export const getTransactions = (params) =>
  isLocalMode() ? local.getTransactions(params) : api.get("/transactions", { params }).then(r => r.data);

export const createTransaction = (data) =>
  isLocalMode() ? local.createTransaction(data) : api.post("/transactions", data).then(r => r.data);

export const updateTransaction = (id, data) =>
  isLocalMode() ? local.updateTransaction(id, data) : api.put(`/transactions/${id}`, data).then(r => r.data);

export const deleteTransaction = (id) =>
  isLocalMode() ? local.deleteTransaction(id) : api.delete(`/transactions/${id}`).then(r => r.data);

export const confirmTransaction = (id) =>
  isLocalMode() ? local.confirmTransaction(id) : api.patch(`/transactions/${id}/confirm`).then(r => r.data);

// ─── Recurrences ──────────────────────────────────────────────

export const getRecurrences = () =>
  isLocalMode() ? local.getRecurrences() : api.get("/recurrences").then(r => r.data);

export const createRecurrence = (data) =>
  isLocalMode() ? local.createRecurrence(data) : api.post("/recurrences", data).then(r => r.data);

export const deleteRecurrence = (id) =>
  isLocalMode() ? local.deleteRecurrence(id) : api.delete(`/recurrences/${id}`).then(r => r.data);

export const generateRecurrence = (id, body) =>
  isLocalMode() ? local.generateRecurrence(id, body) : api.post(`/recurrences/${id}/generate`, body).then(r => r.data);

// ─── Goals ────────────────────────────────────────────────────

export const getGoals = (params) =>
  isLocalMode() ? local.getGoals(params) : api.get("/goals", { params }).then(r => r.data);

export const createGoal = (data) =>
  isLocalMode() ? local.createGoal(data) : api.post("/goals", data).then(r => r.data);

export const updateGoal = (id, data) =>
  isLocalMode() ? local.updateGoal(id, data) : api.put(`/goals/${id}`, data).then(r => r.data);

export const deleteGoal = (id) =>
  isLocalMode() ? local.deleteGoal(id) : api.delete(`/goals/${id}`).then(r => r.data);

// ─── Reports ──────────────────────────────────────────────────

export const getReport = (params) =>
  isLocalMode() ? local.getReport(params) : api.get("/reports/summary", { params }).then(r => r.data);

export const resetLocalData = local.resetLocalData;