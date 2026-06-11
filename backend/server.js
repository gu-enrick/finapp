require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { z, ZodError } = require("zod");
const pool = require("./database");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://finapp-1lzc1a8ed-gustavo-enrick-s-projects.vercel.app",
    /\.vercel\.app$/
  ]
}));
app.use(express.json());
const demo = require("./demo");
app.use(demo);

// ─── LOGS ─────────────────────────────────────────────────────

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? "\x1b[31m" : status >= 400 ? "\x1b[33m" : "\x1b[32m";
    console.log(`${color}[${new Date().toISOString()}] ${req.method} ${req.path} ${status} ${ms}ms\x1b[0m`);
  });
  next();
});

// ─── ERRO PADRONIZADO ─────────────────────────────────────────

const err = (res, status, message, details) =>
  res.status(status).json({ error: message, ...(details && { details }) });

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    if (e instanceof ZodError) {
      return err(res, 400, "Dados inválidos", e.errors.map(x => `${x.path.join(".")}: ${x.message}`));
    }
    if (e.code === "23505") return err(res, 400, "Registro duplicado");
    if (e.code === "23503") return err(res, 400, "Referência inválida");
    console.error("\x1b[31m[ERRO]\x1b[0m", e.message);
    err(res, 500, "Erro interno do servidor");
  }
};

// ─── SCHEMAS ──────────────────────────────────────────────────

const categorySchema = z.object({
  name:  z.string().min(1).max(50),
  type:  z.enum(["expense", "income", "both"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#6366f1"),
});

const transactionSchema = z.object({
  type:        z.enum(["income", "expense"]),
  amount:      z.number().positive(),
  description: z.string().max(200).optional().nullable(),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => {
  const dt = new Date(d);
  return !isNaN(dt.getTime()) && d === dt.toISOString().slice(0, 10);
}, { message: "Data inválida" }),
});

const recurrenceSchema = z.object({
  type:        z.enum(["income", "expense"]),
  amount:      z.number().positive(),
  description: z.string().max(200).optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  frequency:   z.enum(["weekly", "monthly", "yearly"]),
  start_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ─── HELPER: gerar datas de recorrência ───────────────────────

function generateDates(startDate, frequency, count) {
  const dates = [];
  const base = new Date(startDate + "T00:00:00");
  for (let i = 0; i < count; i++) {
    const next = new Date(base);
    if (frequency === "weekly") {
      next.setDate(base.getDate() + i * 7);
    } else if (frequency === "monthly") {
      next.setDate(1);
      next.setMonth(base.getMonth() + i);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(base.getDate(), lastDay));
    } else if (frequency === "yearly") {
      next.setFullYear(base.getFullYear() + i);
    }
    dates.push(next.toISOString().slice(0, 10));
  }
  return dates;
}

function generateUntilEndOfYear(startDate, frequency) {
  const endOfYear = new Date(new Date().getFullYear(), 11, 31);
  const dates = [];
  const base = new Date(startDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let i = 0;
  while (i < 1000) {
    const next = new Date(base);
    if (frequency === "weekly") {
      next.setDate(base.getDate() + i * 7);
    } else if (frequency === "monthly") {
      next.setDate(1);
      next.setMonth(base.getMonth() + i);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(base.getDate(), lastDay));
    } else if (frequency === "yearly") {
      next.setFullYear(base.getFullYear() + i);
    }
    if (next > endOfYear) break;
    if (next >= today) dates.push(next.toISOString().slice(0, 10));
    i++;
  }
  return dates;
}

// ─── CATEGORIES ───────────────────────────────────────────────

app.get("/api/categories", wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM categories ORDER BY name");
  res.json(rows);
}));

app.post("/api/categories", wrap(async (req, res) => {
  const data = categorySchema.parse(req.body);
  const { rows } = await pool.query(
    "INSERT INTO categories (name, type, color) VALUES ($1, $2, $3) RETURNING *",
    [data.name, data.type, data.color]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/categories/:id", wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const data = categorySchema.parse(req.body);
  const { rowCount } = await pool.query(
    "UPDATE categories SET name=$1, type=$2, color=$3 WHERE id=$4",
    [data.name, data.type, data.color, id]
  );
  if (!rowCount) return err(res, 404, "Categoria não encontrada");
  res.json({ ok: true });
}));

app.delete("/api/categories/:id", wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const { rowCount } = await pool.query("DELETE FROM categories WHERE id=$1", [id]);
  if (!rowCount) return err(res, 404, "Categoria não encontrada");
  res.json({ ok: true });
}));

// ─── TRANSACTIONS ─────────────────────────────────────────────

app.get("/api/transactions", wrap(async (req, res) => {
  const { start, end, category_id, type } = req.query;
  let query = `
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE 1=1
  `;
  const params = [];
  let i = 1;
  if (start)       { query += ` AND t.date >= $${i++}`;        params.push(start); }
  if (end)         { query += ` AND t.date <= $${i++}`;        params.push(end); }
  if (category_id) { query += ` AND t.category_id = $${i++}`; params.push(category_id); }
  if (type)        { query += ` AND t.type = $${i++}`;         params.push(type); }
  query += " ORDER BY t.date DESC, t.created_at DESC";
  const { rows } = await pool.query(query, params);
  res.json(rows);
}));

app.post("/api/transactions", wrap(async (req, res) => {
  const data = transactionSchema.parse(req.body);
  const { rows } = await pool.query(
    "INSERT INTO transactions (type, amount, description, category_id, date, is_confirmed) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id",
    [data.type, data.amount, data.description ?? null, data.category_id ?? null, data.date]
  );
  res.status(201).json({ id: rows[0].id });
}));

app.put("/api/transactions/:id", wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const data = transactionSchema.parse(req.body);
  const { rowCount } = await pool.query(
    "UPDATE transactions SET type=$1, amount=$2, description=$3, category_id=$4, date=$5 WHERE id=$6",
    [data.type, data.amount, data.description ?? null, data.category_id ?? null, data.date, id]
  );
  if (!rowCount) return err(res, 404, "Transação não encontrada");
  res.json({ ok: true });
}));

app.delete("/api/transactions/:id", wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const { rowCount } = await pool.query("DELETE FROM transactions WHERE id=$1", [id]);
  if (!rowCount) return err(res, 404, "Transação não encontrada");
  res.json({ ok: true });
}));

// Confirmar transação prevista
app.patch("/api/transactions/:id/confirm", wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const { rowCount } = await pool.query(
    "UPDATE transactions SET is_confirmed=TRUE WHERE id=$1",
    [id]
  );
  if (!rowCount) return err(res, 404, "Transação não encontrada");
  res.json({ ok: true });
}));

// ─── RECURRENCES ──────────────────────────────────────────────

app.get("/api/recurrences", wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.*, c.name as category_name, c.color as category_color
    FROM recurrences r
    LEFT JOIN categories c ON r.category_id = c.id
    ORDER BY r.created_at DESC
  `);
  res.json(rows);
}));

app.post("/api/recurrences", wrap(async (req, res) => {
  const data = recurrenceSchema.parse(req.body);
  const { rows } = await pool.query(
    "INSERT INTO recurrences (type, amount, description, category_id, frequency, start_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [data.type, data.amount, data.description ?? null, data.category_id ?? null, data.frequency, data.start_date]
  );
  res.status(201).json(rows[0]);
}));

app.delete("/api/recurrences/:id", wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  await pool.query("DELETE FROM transactions WHERE recurrence_id=$1 AND is_confirmed=FALSE", [id]);
  const { rowCount } = await pool.query("DELETE FROM recurrences WHERE id=$1", [id]);
  if (!rowCount) return err(res, 404, "Recorrência não encontrada");
  res.json({ ok: true });
}));

// Gerar N ocorrências como previstas
app.post("/api/recurrences/:id/generate", wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");

  const { count, until_end_of_year } = req.body;

  const { rows: [rec] } = await pool.query("SELECT * FROM recurrences WHERE id=$1", [id]);
  if (!rec) return err(res, 404, "Recorrência não encontrada");

  const dates = until_end_of_year
    ? generateUntilEndOfYear(rec.start_date.toISOString().slice(0, 10), rec.frequency)
    : generateDates(rec.start_date.toISOString().slice(0, 10), rec.frequency, count || 12);

  // remove previstas antigas desta recorrência antes de gerar novas
  await pool.query("DELETE FROM transactions WHERE recurrence_id=$1 AND is_confirmed=FALSE", [id]);

  const inserted = [];
  for (const date of dates) {
    const { rows } = await pool.query(
      "INSERT INTO transactions (type, amount, description, category_id, date, is_confirmed, recurrence_id) VALUES ($1, $2, $3, $4, $5, FALSE, $6) RETURNING id",
      [rec.type, rec.amount, rec.description, rec.category_id, date, id]
    );
    inserted.push(rows[0].id);
  }

  res.json({ generated: inserted.length, ids: inserted });
}));

// ─── REPORTS ──────────────────────────────────────────────────

app.get("/api/reports/summary", wrap(async (req, res) => {
  const { start, end } = req.query;
  const s = start || "0001-01-01";
  const e = end   || "9999-12-31";

  const { rows: [totals] } = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=TRUE THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=TRUE THEN amount ELSE 0 END), 0) as total_expense,
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=FALSE THEN amount ELSE 0 END), 0) as projected_income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=FALSE THEN amount ELSE 0 END), 0) as projected_expense,
      COUNT(*) FILTER (WHERE is_confirmed=TRUE) as count
    FROM transactions WHERE date BETWEEN $1 AND $2
  `, [s, e]);

  const { rows: byCategory } = await pool.query(`
    SELECT c.name, c.color, t.type,
      SUM(t.amount) FILTER (WHERE t.is_confirmed=TRUE)  as total,
      SUM(t.amount) FILTER (WHERE t.is_confirmed=FALSE) as projected,
      COUNT(*) as count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.date BETWEEN $1 AND $2
    GROUP BY c.name, c.color, t.type
    ORDER BY total DESC NULLS LAST
  `, [s, e]);

  const { rows: daily } = await pool.query(`
    SELECT date::text,
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=TRUE  THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=TRUE  THEN amount ELSE 0 END), 0) as expense,
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=FALSE THEN amount ELSE 0 END), 0) as projected_income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=FALSE THEN amount ELSE 0 END), 0) as projected_expense
    FROM transactions WHERE date BETWEEN $1 AND $2
    GROUP BY date ORDER BY date
  `, [s, e]);

  const { rows: amounts } = await pool.query(
    "SELECT amount FROM transactions WHERE date BETWEEN $1 AND $2 AND is_confirmed=TRUE ORDER BY amount",
    [s, e]
  );
  const vals = amounts.map(r => parseFloat(r.amount));
  const median = vals.length === 0 ? 0
    : vals.length % 2 === 0
      ? (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2
      : vals[Math.floor(vals.length / 2)];

  const count   = parseInt(totals.count);
  const income  = parseFloat(totals.total_income);
  const expense = parseFloat(totals.total_expense);

  res.json({
    total_income:      income,
    total_expense:     expense,
    projected_income:  parseFloat(totals.projected_income),
    projected_expense: parseFloat(totals.projected_expense),
    count,
    balance:  income - expense,
    average:  count ? (income + expense) / count : 0,
    median,
    byCategory,
    daily,
  });
}));

// ─── GOALS ────────────────────────────────────────────────────
// Cole esse bloco no server.js antes do handler de 404

const goalSchema = z.object({
  kind:        z.enum(["savings", "category_limit", "balance"]),
  label:       z.string().min(1).max(100),
  amount:      z.number().positive(),
  category_id: z.coerce.number().int().positive().optional().nullable(),
});

app.get("/api/goals", wrap(async (req, res) => {
  const { start, end } = req.query;
  const s = start || new Date().toISOString().slice(0, 8) + "01";
  const e = end   || new Date().toISOString().slice(0, 10);

  const { rows: goals } = await pool.query(`
    SELECT g.*, c.name as category_name, c.color as category_color
    FROM goals g
    LEFT JOIN categories c ON g.category_id = c.id
    ORDER BY g.created_at
  `);

  // Calcula progresso de cada meta no período
  const { rows: [totals] } = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=TRUE THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=TRUE THEN amount ELSE 0 END), 0) as total_expense
    FROM transactions WHERE date BETWEEN $1 AND $2
  `, [s, e]);

  const { rows: byCategory } = await pool.query(`
    SELECT t.category_id,
      SUM(t.amount) FILTER (WHERE t.type='expense' AND t.is_confirmed=TRUE) as expense,
      SUM(t.amount) FILTER (WHERE t.type='income'  AND t.is_confirmed=TRUE) as income
    FROM transactions t
    WHERE t.date BETWEEN $1 AND $2
    GROUP BY t.category_id
  `, [s, e]);

  const catMap = {};
  byCategory.forEach(r => { catMap[r.category_id] = r; });

  const income  = parseFloat(totals.total_income);
  const expense = parseFloat(totals.total_expense);
  const balance = income - expense;
  const savings = income - expense;

  const result = goals.map(g => {
    let current = 0;
    let target  = parseFloat(g.amount);

    if (g.kind === "savings")        current = Math.max(0, savings);
    if (g.kind === "balance")        current = Math.max(0, balance);
    if (g.kind === "category_limit") {
      const cat = catMap[g.category_id];
      current = cat ? parseFloat(cat.expense || 0) : 0;
    }

    const percent  = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    const exceeded = g.kind === "category_limit" && current > target;

    return { ...g, current, percent, exceeded };
  });

  res.json(result);
}));

app.post("/api/goals", wrap(async (req, res) => {
  const data = goalSchema.parse(req.body);
  if (data.kind === "category_limit" && !data.category_id) {
    return err(res, 400, "category_id é obrigatório para limite por categoria");
  }
  const { rows } = await pool.query(
    "INSERT INTO goals (kind, label, amount, category_id) VALUES ($1, $2, $3, $4) RETURNING *",
    [data.kind, data.label, data.amount, data.category_id ?? null]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/goals/:id", wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const data = goalSchema.parse(req.body);
  const { rowCount } = await pool.query(
    "UPDATE goals SET kind=$1, label=$2, amount=$3, category_id=$4 WHERE id=$5",
    [data.kind, data.label, data.amount, data.category_id ?? null, id]
  );
  if (!rowCount) return err(res, 404, "Meta não encontrada");
  res.json({ ok: true });
}));

app.delete("/api/goals/:id", wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const { rowCount } = await pool.query("DELETE FROM goals WHERE id=$1", [id]);
  if (!rowCount) return err(res, 404, "Meta não encontrada");
  res.json({ ok: true });
}));

// ─── 404 ──────────────────────────────────────────────────────

app.use((req, res) => err(res, 404, "Rota não encontrada"));

app.listen(PORT, () => console.log(`✅ Backend rodando em http://localhost:${PORT}`));