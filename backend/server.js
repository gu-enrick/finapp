require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { z, ZodError } = require("zod");
const pool = require("./database");
const { requireAuth } = require("./auth");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições — tente novamente em alguns minutos." }
}));

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

// ─── HEALTH ───────────────────────────────────────────────────

app.get("/health", (req, res) => res.json({ ok: true }));

// ─── ERRO PADRONIZADO ─────────────────────────────────────────

const err = (res, status, message, details) =>
  res.status(status).json({ error: message, ...(details && { details }) });

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    if (e instanceof ZodError) {
      const details = (e.errors || e.issues || []).map(x => `${x.path.join(".")}: ${x.message}`);
      return err(res, 400, "Dados inválidos", details);
    }
    if (e.code === "23505") return err(res, 400, "Categoria já existe");
    if (e.code === "23503") return err(res, 400, "Referência inválida");
    console.error("\x1b[31m[ERRO]\x1b[0m", e.message);
    err(res, 500, "Erro interno do servidor");
  }
};

// ─── SCHEMAS ──────────────────────────────────────────────────

const categorySchema = z.object({
  name:  z.string().trim().min(1).max(50),
  type:  z.enum(["expense", "income", "both"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#6366f1"),
});

const transactionSchema = z.object({
  type:        z.enum(["income", "expense"]),
  amount:      z.number().positive(),
  description: z.string().max(200).optional().nullable(),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => {
    const dt = new Date(d);
    return !isNaN(dt.getTime()) && d === dt.toISOString().slice(0, 10);
  }, { message: "Data inválida" }),
});

const recurrenceSchema = z.object({
  type:        z.enum(["income", "expense"]),
  amount:      z.number().positive(),
  description: z.string().max(200).optional().nullable(),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  frequency:   z.enum(["weekly", "monthly", "yearly"]),
  start_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => {
    const dt = new Date(d);
    return !isNaN(dt.getTime()) && d === dt.toISOString().slice(0, 10);
  }, { message: "Data inválida" }),
});

const goalSchema = z.object({
  kind:        z.enum(["savings", "category_limit", "balance"]),
  label:       z.string().min(1).max(100),
  amount:      z.number().positive(),
  category_id: z.coerce.number().int().positive().optional().nullable(),
});

// ─── HELPERS ──────────────────────────────────────────────────

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

app.get("/api/categories", requireAuth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM categories WHERE is_active=TRUE AND user_id=$1 ORDER BY name",
    [req.userId]
  );
  res.json(rows);
}));

app.get("/api/categories/all", requireAuth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM categories WHERE user_id=$1 ORDER BY name",
    [req.userId]
  );
  res.json(rows);
}));

app.post("/api/categories", requireAuth, wrap(async (req, res) => {
  const data = categorySchema.parse(req.body);
  const { rows } = await pool.query(
    "INSERT INTO categories (name, type, color, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
    [data.name, data.type, data.color, req.userId]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/categories/:id", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const data = categorySchema.parse(req.body);
  const { rowCount } = await pool.query(
    "UPDATE categories SET name=$1, type=$2, color=$3 WHERE id=$4 AND user_id=$5",
    [data.name, data.type, data.color, id, req.userId]
  );
  if (!rowCount) return err(res, 404, "Categoria não encontrada");
  res.json({ ok: true });
}));

app.delete("/api/categories/:id", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const { rowCount } = await pool.query(
    "UPDATE categories SET is_active=FALSE WHERE id=$1 AND user_id=$2",
    [id, req.userId]
  );
  if (!rowCount) return err(res, 404, "Categoria não encontrada");
  res.json({ ok: true });
}));

// ─── TRANSACTIONS ─────────────────────────────────────────────

app.get("/api/transactions", requireAuth, wrap(async (req, res) => {
  const { start, end, category_id, type, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
  `;
  let countQuery = `SELECT COUNT(*) FROM transactions t WHERE t.user_id = $1`;
  const params = [req.userId];
  const countParams = [req.userId];
  let i = 2;

  if (start)       { query += ` AND t.date >= $${i}`;        countQuery += ` AND t.date >= $${i}`;        params.push(start);       countParams.push(start);       i++; }
  if (end)         { query += ` AND t.date <= $${i}`;        countQuery += ` AND t.date <= $${i}`;        params.push(end);         countParams.push(end);         i++; }
  if (category_id) { query += ` AND t.category_id = $${i}`; countQuery += ` AND t.category_id = $${i}`; params.push(category_id); countParams.push(category_id); i++; }
  if (type)        { query += ` AND t.type = $${i}`;         countQuery += ` AND t.type = $${i}`;         params.push(type);        countParams.push(type);        i++; }

  query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${i} OFFSET $${i+1}`;
  params.push(parseInt(limit), offset);

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, countParams),
  ]);

  res.json({
    data: rows,
    total: parseInt(countRows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit)) || 1,
  });
}));

app.post("/api/transactions", requireAuth, wrap(async (req, res) => {
  const data = transactionSchema.parse(req.body);
  const { rows } = await pool.query(
    "INSERT INTO transactions (type, amount, description, category_id, date, is_confirmed, user_id) VALUES ($1, $2, $3, $4, $5, TRUE, $6) RETURNING id",
    [data.type, data.amount, data.description ?? null, data.category_id ?? null, data.date, req.userId]
  );
  res.status(201).json({ id: rows[0].id });
}));

app.put("/api/transactions/:id", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const data = transactionSchema.parse(req.body);
  const { rowCount } = await pool.query(
    "UPDATE transactions SET type=$1, amount=$2, description=$3, category_id=$4, date=$5 WHERE id=$6 AND user_id=$7",
    [data.type, data.amount, data.description ?? null, data.category_id ?? null, data.date, id, req.userId]
  );
  if (!rowCount) return err(res, 404, "Transação não encontrada");
  res.json({ ok: true });
}));

app.delete("/api/transactions/:id", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const { rowCount } = await pool.query(
    "DELETE FROM transactions WHERE id=$1 AND user_id=$2",
    [id, req.userId]
  );
  if (!rowCount) return err(res, 404, "Transação não encontrada");
  res.json({ ok: true });
}));

app.patch("/api/transactions/:id/confirm", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const { rowCount } = await pool.query(
    "UPDATE transactions SET is_confirmed=TRUE WHERE id=$1 AND user_id=$2",
    [id, req.userId]
  );
  if (!rowCount) return err(res, 404, "Transação não encontrada");
  res.json({ ok: true });
}));

// ─── RECURRENCES ──────────────────────────────────────────────

app.get("/api/recurrences", requireAuth, wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.*, c.name as category_name, c.color as category_color
    FROM recurrences r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC
  `, [req.userId]);
  res.json(rows);
}));

app.post("/api/recurrences", requireAuth, wrap(async (req, res) => {
  const data = recurrenceSchema.parse(req.body);
  const { rows } = await pool.query(
    "INSERT INTO recurrences (type, amount, description, category_id, frequency, start_date, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [data.type, data.amount, data.description ?? null, data.category_id ?? null, data.frequency, data.start_date, req.userId]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/recurrences/:id", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const data = recurrenceSchema.parse(req.body);
  const { rowCount } = await pool.query(
    "UPDATE recurrences SET type=$1, amount=$2, description=$3, category_id=$4, frequency=$5, start_date=$6 WHERE id=$7 AND user_id=$8",
    [data.type, data.amount, data.description ?? null, data.category_id ?? null, data.frequency, data.start_date, id, req.userId]
  );
  if (!rowCount) return err(res, 404, "Recorrência não encontrada");

  const { propagate } = req.body;
  if (propagate) {
    await pool.query("DELETE FROM transactions WHERE recurrence_id=$1 AND is_confirmed=FALSE AND user_id=$2", [id, req.userId]);
    const dates = generateDates(data.start_date, data.frequency, 12);
    for (const date of dates) {
      await pool.query(
        "INSERT INTO transactions (type, amount, description, category_id, date, is_confirmed, recurrence_id, user_id) VALUES ($1,$2,$3,$4,$5,FALSE,$6,$7)",
        [data.type, data.amount, data.description ?? null, data.category_id ?? null, date, id, req.userId]
      );
    }
  }
  res.json({ ok: true });
}));

app.delete("/api/recurrences/:id", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  await pool.query("DELETE FROM transactions WHERE recurrence_id=$1 AND is_confirmed=FALSE AND user_id=$2", [id, req.userId]);
  const { rowCount } = await pool.query("DELETE FROM recurrences WHERE id=$1 AND user_id=$2", [id, req.userId]);
  if (!rowCount) return err(res, 404, "Recorrência não encontrada");
  res.json({ ok: true });
}));

app.post("/api/recurrences/:id/generate", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const { count, until_end_of_year } = req.body;
  const { rows: [rec] } = await pool.query("SELECT * FROM recurrences WHERE id=$1 AND user_id=$2", [id, req.userId]);
  if (!rec) return err(res, 404, "Recorrência não encontrada");

  const dates = until_end_of_year
    ? generateUntilEndOfYear(rec.start_date.toISOString().slice(0, 10), rec.frequency)
    : generateDates(rec.start_date.toISOString().slice(0, 10), rec.frequency, count || 12);

  await pool.query("DELETE FROM transactions WHERE recurrence_id=$1 AND is_confirmed=FALSE AND user_id=$2", [id, req.userId]);

  const inserted = [];
  for (const date of dates) {
    const { rows } = await pool.query(
      "INSERT INTO transactions (type, amount, description, category_id, date, is_confirmed, recurrence_id, user_id) VALUES ($1,$2,$3,$4,$5,FALSE,$6,$7) RETURNING id",
      [rec.type, rec.amount, rec.description, rec.category_id, date, id, req.userId]
    );
    inserted.push(rows[0].id);
  }
  res.json({ generated: inserted.length, ids: inserted });
}));

// ─── GOALS ────────────────────────────────────────────────────

app.get("/api/goals", requireAuth, wrap(async (req, res) => {
  const { start, end } = req.query;
  const s = start || new Date().toISOString().slice(0, 8) + "01";
  const e = end   || new Date().toISOString().slice(0, 10);

  const { rows: goals } = await pool.query(`
    SELECT g.*, c.name as category_name, c.color as category_color
    FROM goals g
    LEFT JOIN categories c ON g.category_id = c.id
    WHERE g.user_id = $1
    ORDER BY g.created_at
  `, [req.userId]);

  const { rows: [totals] } = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=TRUE THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=TRUE THEN amount ELSE 0 END), 0) as total_expense
    FROM transactions WHERE user_id=$1 AND date BETWEEN $2 AND $3
  `, [req.userId, s, e]);

  const { rows: byCategory } = await pool.query(`
    SELECT t.category_id,
      SUM(t.amount) FILTER (WHERE t.type='expense' AND t.is_confirmed=TRUE) as expense,
      SUM(t.amount) FILTER (WHERE t.type='income'  AND t.is_confirmed=TRUE) as income
    FROM transactions t
    WHERE t.user_id=$1 AND t.date BETWEEN $2 AND $3
    GROUP BY t.category_id
  `, [req.userId, s, e]);

  const catMap = {};
  byCategory.forEach(r => { catMap[r.category_id] = r; });

  const income  = parseFloat(totals.total_income);
  const expense = parseFloat(totals.total_expense);
  const balance = income - expense;
  const savings = income - expense;

  const result = goals.map(g => {
    let current = 0;
    const target = parseFloat(g.amount);

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

app.post("/api/goals", requireAuth, wrap(async (req, res) => {
  const data = goalSchema.parse(req.body);
  if (data.kind === "category_limit" && !data.category_id) {
    return err(res, 400, "category_id é obrigatório para limite por categoria");
  }
  const { rows } = await pool.query(
    "INSERT INTO goals (kind, label, amount, category_id, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [data.kind, data.label, data.amount, data.category_id ?? null, req.userId]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/goals/:id", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const data = goalSchema.parse(req.body);
  const { rowCount } = await pool.query(
    "UPDATE goals SET kind=$1, label=$2, amount=$3, category_id=$4 WHERE id=$5 AND user_id=$6",
    [data.kind, data.label, data.amount, data.category_id ?? null, id, req.userId]
  );
  if (!rowCount) return err(res, 404, "Meta não encontrada");
  res.json({ ok: true });
}));

app.delete("/api/goals/:id", requireAuth, wrap(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return err(res, 400, "ID inválido");
  const { rowCount } = await pool.query(
    "DELETE FROM goals WHERE id=$1 AND user_id=$2",
    [id, req.userId]
  );
  if (!rowCount) return err(res, 404, "Meta não encontrada");
  res.json({ ok: true });
}));

// ─── REPORTS ──────────────────────────────────────────────────

app.get("/api/reports/summary", requireAuth, wrap(async (req, res) => {
  const { start, end } = req.query;
  const s = start || "0001-01-01";
  const e = end   || "9999-12-31";

  const { rows: [totals] } = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=TRUE  THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=TRUE  THEN amount ELSE 0 END), 0) as total_expense,
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=FALSE THEN amount ELSE 0 END), 0) as projected_income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=FALSE THEN amount ELSE 0 END), 0) as projected_expense,
      COUNT(*) FILTER (WHERE is_confirmed=TRUE) as count
    FROM transactions WHERE user_id=$1 AND date BETWEEN $2 AND $3
  `, [req.userId, s, e]);

  const { rows: byCategory } = await pool.query(`
    SELECT c.name, c.color, t.type,
      SUM(t.amount) FILTER (WHERE t.is_confirmed=TRUE)  as total,
      SUM(t.amount) FILTER (WHERE t.is_confirmed=FALSE) as projected,
      COUNT(*) as count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id=$1 AND t.date BETWEEN $2 AND $3
    GROUP BY c.name, c.color, t.type
    ORDER BY total DESC NULLS LAST
  `, [req.userId, s, e]);

  const { rows: daily } = await pool.query(`
    SELECT date::text,
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=TRUE  THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=TRUE  THEN amount ELSE 0 END), 0) as expense,
      COALESCE(SUM(CASE WHEN type='income'  AND is_confirmed=FALSE THEN amount ELSE 0 END), 0) as projected_income,
      COALESCE(SUM(CASE WHEN type='expense' AND is_confirmed=FALSE THEN amount ELSE 0 END), 0) as projected_expense
    FROM transactions WHERE user_id=$1 AND date BETWEEN $2 AND $3
    GROUP BY date ORDER BY date
  `, [req.userId, s, e]);

  const { rows: amounts } = await pool.query(
    "SELECT amount FROM transactions WHERE user_id=$1 AND date BETWEEN $2 AND $3 AND is_confirmed=TRUE ORDER BY amount",
    [req.userId, s, e]
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

// ─── 404 ──────────────────────────────────────────────────────

app.use((req, res) => err(res, 404, "Rota não encontrada"));

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`✅ Backend rodando em http://localhost:${PORT}`));
}

module.exports = app;