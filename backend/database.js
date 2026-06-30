const path = require("path");
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
require("dotenv").config({ path: path.join(__dirname, envFile) });

const { Pool } = require("pg");

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user:     process.env.DB_USER,
        host:     process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port:     parseInt(process.env.DB_PORT || "5432"),
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income', 'both')),
      color TEXT DEFAULT '#6366f1',
      is_active BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS recurrences (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount NUMERIC(10,2) NOT NULL,
      description TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'yearly')),
      start_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount NUMERIC(10,2) NOT NULL,
      description TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      is_confirmed BOOLEAN DEFAULT TRUE,
      recurrence_id INTEGER REFERENCES recurrences(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('savings', 'category_limit', 'balance')),
      label TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT TRUE;`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_id INTEGER REFERENCES recurrences(id) ON DELETE SET NULL;`);

  if (process.env.NODE_ENV !== "test") {
    await pool.query(`
      INSERT INTO categories (name, type, color) VALUES
        ('Mercado', 'expense', '#ef4444'),
        ('Streaming', 'expense', '#8b5cf6'),
        ('E-commerce', 'expense', '#f97316'),
        ('Água', 'expense', '#06b6d4'),
        ('Luz', 'expense', '#eab308'),
        ('Internet', 'expense', '#3b82f6'),
        ('Telefonia', 'expense', '#ec4899'),
        ('Salário', 'income', '#22c55e'),
        ('Freelance', 'income', '#10b981'),
        ('Outros', 'both', '#94a3b8')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log("✅ Banco inicializado");
  }
};

init().catch(console.error);

module.exports = pool;