import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:3001/api" });

export const getCategories = () => api.get("/categories").then(r => r.data);
export const createCategory = (data) => api.post("/categories", data).then(r => r.data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data).then(r => r.data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`).then(r => r.data);

export const getTransactions = (params) => api.get("/transactions", { params }).then(r => r.data);
export const createTransaction = (data) => api.post("/transactions", data).then(r => r.data);
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data).then(r => r.data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`).then(r => r.data);
export const confirmTransaction = (id) => api.patch(`/transactions/${id}/confirm`).then(r => r.data);

export const getRecurrences = () => api.get("/recurrences").then(r => r.data);
export const createRecurrence = (data) => api.post("/recurrences", data).then(r => r.data);
export const deleteRecurrence = (id) => api.delete(`/recurrences/${id}`).then(r => r.data);
export const generateRecurrence = (id, body) => api.post(`/recurrences/${id}/generate`, body).then(r => r.data);

export const getReport = (params) => api.get("/reports/summary", { params }).then(r => r.data);

export const getGoals = (params) => api.get("/goals", { params }).then(r => r.data);
export const createGoal = (data) => api.post("/goals", data).then(r => r.data);
export const updateGoal = (id, data) => api.put(`/goals/${id}`, data).then(r => r.data);
export const deleteGoal = (id) => api.delete(`/goals/${id}`).then(r => r.data);