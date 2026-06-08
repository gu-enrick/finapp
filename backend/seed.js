require("dotenv").config();
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
      }
);

const rand  = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const randi = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const date  = (year, month, day) => `${year}-${String(month).padStart(2,"0")}-${String(Math.floor(day)).padStart(2,"0")}`;
const lastDay = (year, month) => new Date(year, month, 0).getDate();

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM transactions");
    await client.query("DELETE FROM recurrences");
    await client.query("DELETE FROM goals");

    const cats = [
      { name: "Salário",     type: "income",  color: "#22c55e" },
      { name: "Freelance",   type: "income",  color: "#10b981" },
      { name: "Mercado",     type: "expense", color: "#ef4444" },
      { name: "Aluguel",     type: "expense", color: "#dc2626" },
      { name: "Delivery",    type: "expense", color: "#f97316" },
      { name: "Combustível", type: "expense", color: "#eab308" },
      { name: "Internet",    type: "expense", color: "#3b82f6" },
      { name: "Água",        type: "expense", color: "#06b6d4" },
      { name: "Luz",         type: "expense", color: "#fbbf24" },
      { name: "Telefonia",   type: "expense", color: "#ec4899" },
      { name: "Streaming",   type: "expense", color: "#8b5cf6" },
      { name: "E-commerce",  type: "expense", color: "#f97316" },
      { name: "Manutenção",  type: "expense", color: "#6b7280" },
      { name: "Saúde",       type: "expense", color: "#14b8a6" },
      { name: "Lazer",       type: "expense", color: "#a855f7" },
      { name: "Outros",      type: "both",    color: "#94a3b8" },
    ];

    const catMap = {};
    for (const c of cats) {
      const { rows } = await client.query(`
        INSERT INTO categories (name, type, color)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET type=EXCLUDED.type, color=EXCLUDED.color
        RETURNING id, name
      `, [c.name, c.type, c.color]);
      catMap[c.name] = rows[0].id;
    }

    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    let total   = 0;

    for (let i = 0; i < 12; i++) {
      const d     = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const year  = d.getFullYear();
      const month = d.getMonth() + 1;
      const last  = lastDay(year, month);

      const isJaneiro  = month === 1;
      const isJulho    = month === 7;
      const isNovembro = month === 11;
      const isDezembro = month === 12;

      await client.query(
        "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
        ["income", rand(3400, 3600), "Salário mensal", catMap["Salário"], date(year, month, 5)]
      );
      total++;

      if (Math.random() < 0.4) {
        await client.query(
          "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
          ["income", rand(200, 800), "Freelance", catMap["Freelance"], date(year, month, randi(10, 25))]
        );
        total++;
      }

      await client.query(
        "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
        ["expense", rand(1150, 1250), "Aluguel", catMap["Aluguel"], date(year, month, 10)]
      );
      total++;

      const fixas = [
        { valor: rand(90, 115),  desc: "Internet",      cat: "Internet",  dia: 8  },
        { valor: rand(55, 80),   desc: "Conta de água", cat: "Água",      dia: 12 },
        { valor: rand(70, 130),  desc: "Conta de luz",  cat: "Luz",       dia: 15 },
        { valor: rand(75, 90),   desc: "Telefonia",     cat: "Telefonia", dia: 8  },
        { valor: rand(42, 48),   desc: "Streaming",     cat: "Streaming", dia: 1  },
      ];
      for (const f of fixas) {
        await client.query(
          "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
          ["expense", f.valor, f.desc, catMap[f.cat], date(year, month, f.dia)]
        );
        total++;
      }

      for (let j = 0; j < randi(2, 3); j++) {
        await client.query(
          "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
          ["expense", rand(150, 220), "Combustível", catMap["Combustível"], date(year, month, randi(1, last))]
        );
        total++;
      }

      for (let j = 0; j < randi(3, 5); j++) {
        await client.query(
          "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
          ["expense", rand(80, 220), "Mercado", catMap["Mercado"], date(year, month, randi(1, last))]
        );
        total++;
      }

      const pedidos = isJulho ? randi(8, 12) : randi(4, 9);
      for (let j = 0; j < pedidos; j++) {
        await client.query(
          "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
          ["expense", rand(28, 85), pick(["iFood", "Rappi", "Delivery"]), catMap["Delivery"], date(year, month, randi(1, last))]
        );
        total++;
      }

      if (isNovembro || isDezembro || Math.random() < 0.4) {
        const compras = isNovembro || isDezembro ? randi(2, 4) : 1;
        for (let j = 0; j < compras; j++) {
          await client.query(
            "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
            ["expense", rand(60, 350), pick(["Amazon", "Shopee", "Mercado Livre", "AliExpress"]), catMap["E-commerce"], date(year, month, randi(1, last))]
          );
          total++;
        }
      }

      if (isJaneiro || Math.random() < 0.2) {
        const desc  = isJaneiro ? "IPVA" : pick(["Revisão", "Pneu", "Óleo", "Freio"]);
        const valor = isJaneiro ? rand(800, 1200) : rand(150, 600);
        await client.query(
          "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
          ["expense", valor, desc, catMap["Manutenção"], date(year, month, randi(1, last))]
        );
        total++;
      }

      if (Math.random() < 0.3) {
        await client.query(
          "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
          ["expense", rand(50, 250), pick(["Farmácia", "Consulta", "Exame"]), catMap["Saúde"], date(year, month, randi(1, last))]
        );
        total++;
      }

      for (let j = 0; j < randi(1, 3); j++) {
        await client.query(
          "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
          ["expense", rand(30, 150), pick(["Bar", "Cinema", "Academia", "Passeio"]), catMap["Lazer"], date(year, month, randi(1, last))]
        );
        total++;
      }

      if (isDezembro) {
        await client.query(
          "INSERT INTO transactions (type, amount, description, category_id, date) VALUES ($1,$2,$3,$4,$5)",
          ["expense", rand(200, 500), "Presentes de Natal", catMap["E-commerce"], date(year, 12, randi(10, 20))]
        );
        total++;
      }

      console.log(`✅ Mês ${String(month).padStart(2,"0")}/${year} gerado`);
    }

    await client.query(
      "INSERT INTO goals (kind, label, amount) VALUES ($1,$2,$3)",
      ["savings", "Reserva de emergência mensal", 500]
    );
    await client.query(
      "INSERT INTO goals (kind, label, amount, category_id) VALUES ($1,$2,$3,$4)",
      ["category_limit", "Limite de delivery", 350, catMap["Delivery"]]
    );
    await client.query(
      "INSERT INTO goals (kind, label, amount) VALUES ($1,$2,$3)",
      ["balance", "Saldo mínimo mensal", 200]
    );

    await client.query("COMMIT");
    console.log(`\n🎉 Seed concluído — ${total} transações inseridas + 3 metas`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Erro no seed:", e.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();