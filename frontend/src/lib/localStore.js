// Simula a API usando localStorage — usado no "Modo local"
const KEY = "finapp_local_data";

const uid = () => Date.now() + Math.random().toString(36).slice(2, 8);

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedDefault();
    return JSON.parse(raw);
  } catch {
    return seedDefault();
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function seedDefault() {
  const data = {
    categories: [
      { id: 1, name: "Mercado", type: "expense", color: "#ef4444", is_active: true },
      { id: 2, name: "Streaming", type: "expense", color: "#8b5cf6", is_active: true },
      { id: 3, name: "Delivery", type: "expense", color: "#f97316", is_active: true },
      { id: 4, name: "Internet", type: "expense", color: "#3b82f6", is_active: true },
      { id: 5, name: "Salário", type: "income", color: "#22c55e", is_active: true },
      { id: 6, name: "Freelance", type: "income", color: "#10b981", is_active: true },
      { id: 7, name: "Outros", type: "both", color: "#94a3b8", is_active: true },
    ],
    transactions: [],
    recurrences: [],
    goals: [],
  };
  write(data);
  return data;
}

export function resetLocalData() {
  localStorage.removeItem(KEY);
  return seedDefault();
}

// ─── Categories ───────────────────────────────────────────────

export const getCategories = async () => read().categories.filter(c => c.is_active);
export const getAllCategories = async () => read().categories;

export const createCategory = async (data) => {
  const db = read();
  const cat = { id: uid(), ...data, is_active: true };
  db.categories.push(cat);
  write(db);
  return cat;
};

export const updateCategory = async (id, data) => {
  const db = read();
  const i = db.categories.findIndex(c => String(c.id) === String(id));
  if (i >= 0) db.categories[i] = { ...db.categories[i], ...data };
  write(db);
  return { ok: true };
};

export const deleteCategory = async (id) => {
  const db = read();
  const i = db.categories.findIndex(c => String(c.id) === String(id));
  if (i >= 0) db.categories[i].is_active = false;
  write(db);
  return { ok: true };
};

// ─── Transactions ─────────────────────────────────────────────

function categoryInfo(db, category_id) {
  const c = db.categories.find(cat => String(cat.id) === String(category_id));
  return c ? { category_name: c.name, category_color: c.color } : { category_name: null, category_color: null };
}

export const getTransactions = async (params = {}) => {
  const db = read();
  let list = [...db.transactions];

  if (params.start) list = list.filter(t => t.date >= params.start);
  if (params.end)   list = list.filter(t => t.date <= params.end);
  if (params.type)  list = list.filter(t => t.type === params.type);
  if (params.category_id) list = list.filter(t => String(t.category_id) === String(params.category_id));

  list.sort((a, b) => (b.date.localeCompare(a.date)) || (b.created_at - a.created_at));

  const page  = parseInt(params.page || 1);
  const limit = parseInt(params.limit || 50);
  const start = (page - 1) * limit;
  const pageItems = list.slice(start, start + limit).map(t => ({ ...t, ...categoryInfo(db, t.category_id) }));

  return {
    data: pageItems,
    total: list.length,
    page,
    limit,
    totalPages: Math.ceil(list.length / limit) || 1,
  };
};

export const createTransaction = async (data) => {
  const db = read();
  const tx = { id: uid(), ...data, is_confirmed: true, created_at: Date.now() };
  db.transactions.push(tx);
  write(db);
  return { id: tx.id };
};

export const updateTransaction = async (id, data) => {
  const db = read();
  const i = db.transactions.findIndex(t => String(t.id) === String(id));
  if (i >= 0) db.transactions[i] = { ...db.transactions[i], ...data };
  write(db);
  return { ok: true };
};

export const deleteTransaction = async (id) => {
  const db = read();
  db.transactions = db.transactions.filter(t => String(t.id) !== String(id));
  write(db);
  return { ok: true };
};

export const confirmTransaction = async (id) => {
  const db = read();
  const i = db.transactions.findIndex(t => String(t.id) === String(id));
  if (i >= 0) db.transactions[i].is_confirmed = true;
  write(db);
  return { ok: true };
};

// ─── Recurrences ──────────────────────────────────────────────

export const getRecurrences = async () => {
  const db = read();
  return db.recurrences.map(r => ({ ...r, ...categoryInfo(db, r.category_id) }));
};

export const createRecurrence = async (data) => {
  const db = read();
  const rec = { id: uid(), ...data, created_at: Date.now() };
  db.recurrences.push(rec);
  write(db);
  return rec;
};

export const deleteRecurrence = async (id) => {
  const db = read();
  db.recurrences = db.recurrences.filter(r => String(r.id) !== String(id));
  db.transactions = db.transactions.filter(t => !(String(t.recurrence_id) === String(id) && !t.is_confirmed));
  write(db);
  return { ok: true };
};

function shiftDate(dateStr, unit, amount) {
  const d = new Date(dateStr + "T00:00:00");
  if (unit === "day") d.setDate(d.getDate() + amount);
  if (unit === "month") {
    d.setDate(1);
    d.setMonth(d.getMonth() + amount);
  }
  if (unit === "year") d.setFullYear(d.getFullYear() + amount);
  return d.toISOString().slice(0, 10);
}

export const generateRecurrence = async (id, opts = {}) => {
  const db = read();
  const rec = db.recurrences.find(r => String(r.id) === String(id));
  if (!rec) return { generated: 0 };

  db.transactions = db.transactions.filter(t => !(String(t.recurrence_id) === String(id) && !t.is_confirmed));

  const dates = [];
  const count = opts.until_end_of_year ? 24 : (opts.count || 12);
  const unit = rec.frequency === "weekly" ? "day" : rec.frequency === "yearly" ? "year" : "month";
  const step = rec.frequency === "weekly" ? 7 : 1;
  const endOfYear = new Date(new Date().getFullYear(), 11, 31);

  for (let i = 0; i < count; i++) {
    const d = shiftDate(rec.start_date, unit, i * step);
    if (opts.until_end_of_year && new Date(d + "T00:00:00") > endOfYear) break;
    dates.push(d);
  }

  const ids = [];
  dates.forEach(date => {
    const tx = { id: uid(), type: rec.type, amount: rec.amount, description: rec.description, category_id: rec.category_id, date, is_confirmed: false, recurrence_id: id, created_at: Date.now() };
    db.transactions.push(tx);
    ids.push(tx.id);
  });

  write(db);
  return { generated: ids.length, ids };
};

// ─── Goals ────────────────────────────────────────────────────

function periodTotals(db, start, end) {
  const list = db.transactions.filter(t => t.date >= start && t.date <= end && t.is_confirmed);
  const income  = list.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = list.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  return { income, expense, list };
}

export const getGoals = async (params = {}) => {
  const db = read();
  const now = new Date();
  const start = params.start || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end   = params.end   || now.toISOString().slice(0, 10);

  const { income, expense, list } = periodTotals(db, start, end);
  const balance = income - expense;
  const savings = income - expense;

  return db.goals.map(g => {
    let current = 0;
    const target = Number(g.amount);

    if (g.kind === "savings") current = Math.max(0, savings);
    if (g.kind === "balance") current = Math.max(0, balance);
    if (g.kind === "category_limit") {
      current = list.filter(t => t.type === "expense" && String(t.category_id) === String(g.category_id))
        .reduce((s, t) => s + Number(t.amount), 0);
    }

    const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    const exceeded = g.kind === "category_limit" && current > target;
    const cat = db.categories.find(c => String(c.id) === String(g.category_id));

    return { ...g, current, percent, exceeded, category_name: cat?.name, category_color: cat?.color };
  });
};

export const createGoal = async (data) => {
  const db = read();
  const goal = { id: uid(), ...data, created_at: Date.now() };
  db.goals.push(goal);
  write(db);
  return goal;
};

export const updateGoal = async (id, data) => {
  const db = read();
  const i = db.goals.findIndex(g => String(g.id) === String(id));
  if (i >= 0) db.goals[i] = { ...db.goals[i], ...data };
  write(db);
  return { ok: true };
};

export const deleteGoal = async (id) => {
  const db = read();
  db.goals = db.goals.filter(g => String(g.id) !== String(id));
  write(db);
  return { ok: true };
};

// ─── Reports ──────────────────────────────────────────────────

export const getReport = async (params = {}) => {
  const db = read();
  const start = params.start || "0001-01-01";
  const end   = params.end   || "9999-12-31";

  const confirmedList = db.transactions.filter(t => t.date >= start && t.date <= end && t.is_confirmed);
  const projectedList = db.transactions.filter(t => t.date >= start && t.date <= end && !t.is_confirmed);

  const total_income  = confirmedList.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const total_expense = confirmedList.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const projected_income  = projectedList.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const projected_expense = projectedList.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const byCategoryMap = {};
  confirmedList.forEach(t => {
    const cat = db.categories.find(c => String(c.id) === String(t.category_id));
    const key = `${t.category_id}-${t.type}`;
    if (!byCategoryMap[key]) {
      byCategoryMap[key] = { name: cat?.name || "Sem categoria", color: cat?.color || "#94a3b8", type: t.type, total: 0, count: 0 };
    }
    byCategoryMap[key].total += Number(t.amount);
    byCategoryMap[key].count++;
  });
  const byCategory = Object.values(byCategoryMap).sort((a, b) => b.total - a.total);

  const dailyMap = {};
  confirmedList.forEach(t => {
    if (!dailyMap[t.date]) dailyMap[t.date] = { date: t.date, income: 0, expense: 0 };
    dailyMap[t.date][t.type === "income" ? "income" : "expense"] += Number(t.amount);
  });
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  const amounts = confirmedList.map(t => Number(t.amount)).sort((a, b) => a - b);
  const median = amounts.length === 0 ? 0
    : amounts.length % 2 === 0
      ? (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2
      : amounts[Math.floor(amounts.length / 2)];

  const count = confirmedList.length;

  return {
    total_income, total_expense, projected_income, projected_expense, count,
    balance: total_income - total_expense,
    average: count ? (total_income + total_expense) / count : 0,
    median, byCategory, daily,
  };
};