process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../server");
const pool = require("../database");

let categoryId;

beforeAll(async () => {
  await new Promise(r => setTimeout(r, 500));
  await pool.query("DELETE FROM transactions");
  await pool.query("DELETE FROM recurrences");
  await pool.query("DELETE FROM goals");
  await pool.query("DELETE FROM categories");

  const { rows } = await pool.query(
    "INSERT INTO categories (name, type, color) VALUES ('Delivery', 'expense', '#f97316') RETURNING id"
  );
  categoryId = rows[0].id;

  // cria transações de teste no período atual
  const today = new Date().toISOString().slice(0, 10);
  await pool.query(
    "INSERT INTO transactions (type, amount, category_id, date, is_confirmed) VALUES ('income', 3000, NULL, $1, TRUE)",
    [today]
  );
  await pool.query(
    "INSERT INTO transactions (type, amount, category_id, date, is_confirmed) VALUES ('expense', 200, $1, $2, TRUE)",
    [categoryId, today]
  );
  await pool.query(
    "INSERT INTO transactions (type, amount, category_id, date, is_confirmed) VALUES ('expense', 500, NULL, $1, TRUE)",
    [today]
  );
});

afterAll(async () => {
  await pool.end();
});

describe("Goals API", () => {
  let savingsId, limitId, balanceId;

  test("POST /api/goals cria meta de economia", async () => {
    const res = await request(app)
      .post("/api/goals")
      .send({ kind: "savings", label: "Reserva", amount: 1000 });
    expect(res.status).toBe(201);
    savingsId = res.body.id;
  });

  test("POST /api/goals cria limite por categoria", async () => {
    const res = await request(app)
      .post("/api/goals")
      .send({ kind: "category_limit", label: "Limite Delivery", amount: 350, category_id: categoryId });
    expect(res.status).toBe(201);
    limitId = res.body.id;
  });

  test("POST /api/goals rejeita category_limit sem category_id", async () => {
    const res = await request(app)
      .post("/api/goals")
      .send({ kind: "category_limit", label: "Sem categoria", amount: 100 });
    expect(res.status).toBe(400);
  });

  test("POST /api/goals cria meta de saldo", async () => {
    const res = await request(app)
      .post("/api/goals")
      .send({ kind: "balance", label: "Saldo mínimo", amount: 500 });
    expect(res.status).toBe(201);
    balanceId = res.body.id;
  });

  test("POST /api/goals rejeita kind inválido", async () => {
    const res = await request(app)
      .post("/api/goals")
      .send({ kind: "invalido", label: "Teste", amount: 100 });
    expect(res.status).toBe(400);
  });

  test("POST /api/goals rejeita valor negativo", async () => {
    const res = await request(app)
      .post("/api/goals")
      .send({ kind: "savings", label: "Negativa", amount: -50 });
    expect(res.status).toBe(400);
  });

  test("GET /api/goals calcula progresso de limite por categoria corretamente", async () => {
    const res = await request(app).get("/api/goals");
    const limit = res.body.find(g => g.id === limitId);

    expect(limit).toBeDefined();
    expect(limit.current).toBe(200); // gasto real na categoria Delivery
    expect(limit.percent).toBeCloseTo((200 / 350) * 100, 1);
    expect(limit.exceeded).toBe(false);
  });

  test("GET /api/goals calcula meta de economia (entradas - gastos)", async () => {
    const res = await request(app).get("/api/goals");
    const savings = res.body.find(g => g.id === savingsId);

    // 3000 entrada - (200 + 500) gastos = 2300
    expect(savings.current).toBe(2300);
  });

  test("GET /api/goals marca exceeded=true quando limite estourado", async () => {
    await pool.query(
      "INSERT INTO transactions (type, amount, category_id, date, is_confirmed) VALUES ('expense', 999, $1, CURRENT_DATE, TRUE)",
      [categoryId]
    );

    const res = await request(app).get("/api/goals");
    const limit = res.body.find(g => g.id === limitId);

    expect(limit.exceeded).toBe(true);
    expect(limit.current).toBeGreaterThan(parseFloat(limit.amount));
  });

  test("PUT /api/goals/:id atualiza meta", async () => {
    const res = await request(app)
      .put(`/api/goals/${savingsId}`)
      .send({ kind: "savings", label: "Reserva atualizada", amount: 1500 });
    expect(res.status).toBe(200);

    const { rows } = await pool.query("SELECT label, amount FROM goals WHERE id=$1", [savingsId]);
    expect(rows[0].label).toBe("Reserva atualizada");
    expect(parseFloat(rows[0].amount)).toBe(1500);
  });

  test("PUT /api/goals/:id com ID inexistente retorna 404", async () => {
    const res = await request(app)
      .put("/api/goals/999999")
      .send({ kind: "savings", label: "X", amount: 100 });
    expect(res.status).toBe(404);
  });

  test("DELETE /api/goals/:id remove a meta", async () => {
    const res = await request(app).delete(`/api/goals/${balanceId}`);
    expect(res.status).toBe(200);

    const check = await pool.query("SELECT * FROM goals WHERE id=$1", [balanceId]);
    expect(check.rows.length).toBe(0);
  });

  test("DELETE /api/goals/:id com ID inexistente retorna 404", async () => {
    const res = await request(app).delete("/api/goals/999999");
    expect(res.status).toBe(404);
  });
});