require("dotenv").config();
const Database = require("better-sqlite3");
const { Pool } = require("pg");
const path = require("path");

const sqlite = new Database(path.join(__dirname, "finapp.db"));
const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     parseInt(process.env.DB_PORT || "5432"),
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ─── Categorias ───────────────────────────────────────────
    const categories = sqlite.prepare("SELECT * FROM categories").all();
    console.log(`📦 Migrando ${categories.length} categorias...`);

    const catIdMap = {}; // mapeia id antigo -> id novo

    for (const c of categories) {
      const { rows } = await client.query(`
        INSERT INTO categories (name, type, color)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, color=EXCLUDED.color
        RETURNING id
      `, [c.name, c.type, c.color || "#6366f1"]);
      catIdMap[c.id] = rows[0].id;
    }
    console.log("✅ Categorias migradas");

    // ─── Transações ───────────────────────────────────────────
    const transactions = sqlite.prepare("SELECT * FROM transactions").all();
    console.log(`📦 Migrando ${transactions.length} transações...`);

    let ok = 0, skip = 0;
    for (const t of transactions) {
      try {
        const catId = t.category_id ? catIdMap[t.category_id] ?? null : null;
        await client.query(`
          INSERT INTO transactions (type, amount, description, category_id, date, is_confirmed, created_at)
          VALUES ($1, $2, $3, $4, $5, TRUE, $6)
        `, [t.type, t.amount, t.description || null, catId, t.date, t.created_at || new Date().toISOString()]);
        ok++;
      } catch (e) {
        console.warn(`⚠️  Transação id=${t.id} pulada: ${e.message}`);
        skip++;
      }
    }
    console.log(`✅ Transações: ${ok} migradas, ${skip} puladas`);

    await client.query("COMMIT");
    console.log("\n🎉 Migração concluída com sucesso!");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Erro na migração, rollback feito:", e.message);
  } finally {
    client.release();
    pool.end();
    sqlite.close();
  }
}

migrate();