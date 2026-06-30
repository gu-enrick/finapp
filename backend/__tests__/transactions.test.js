process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../server");
const pool = require("../database");

let categoryId;

beforeAll(async () => {
  // espera o banco inicializar (init() é assíncrono no database.js)
  await new Promise(r => setTimeout(r, 500));

  // limpa tabelas antes de rodar
  await pool.query("DELETE FROM transactions");
  await pool.query("DELETE FROM recurrences");
  await pool.query("DELETE FROM goals");
  await pool.query("DELETE FROM categories");

  const { rows } = await pool.query(
    "INSERT INTO categories (name, type, color) VALUES ('Teste', 'expense', '#ef4444') RETURNING id"
  );
  categoryId = rows[0].id;
});

afterAll(async () => {
  await pool.end();
});

describe("Transactions API", () => {
  let createdId;

  test("POST /api/transactions cria uma transação válida", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({
        type: "expense",
        amount: 50.5,
        description: "Teste de compra",
        category_id: categoryId,
        date: "2026-06-15",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    createdId = res.body.id;
  });

  test("POST /api/transactions rejeita amount negativo", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({
        type: "expense",
        amount: -10,
        date: "2026-06-15",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/transactions rejeita data inválida", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({
        type: "expense",
        amount: 10,
        date: "9999-99-99",
      });

    expect(res.status).toBe(400);
  });

  test("POST /api/transactions rejeita type inválido", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({
        type: "invalid_type",
        amount: 10,
        date: "2026-06-15",
      });

    expect(res.status).toBe(400);
  });

  test("GET /api/transactions retorna a transação criada", async () => {
    const res = await request(app).get("/api/transactions").query({ limit: 50 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.data)).toBe(true);

    const found = res.body.data.find(t => t.id === createdId);
    expect(found).toBeDefined();
    expect(found.description).toBe("Teste de compra");
  });

  test("GET /api/transactions filtra por categoria corretamente", async () => {
    const res = await request(app)
      .get("/api/transactions")
      .query({ category_id: categoryId });

    expect(res.status).toBe(200);
    expect(res.body.data.every(t => t.category_id === categoryId)).toBe(true);
  });

  test("PUT /api/transactions/:id atualiza a transação", async () => {
    const res = await request(app)
      .put(`/api/transactions/${createdId}`)
      .send({
        type: "expense",
        amount: 99.9,
        description: "Atualizado",
        category_id: categoryId,
        date: "2026-06-16",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("PUT /api/transactions/:id com ID inexistente retorna 404", async () => {
    const res = await request(app)
      .put("/api/transactions/999999")
      .send({
        type: "expense",
        amount: 10,
        date: "2026-06-15",
      });

    expect(res.status).toBe(404);
  });

  test("PATCH /api/transactions/:id/confirm confirma transação prevista", async () => {
    const created = await request(app)
      .post("/api/transactions")
      .send({ type: "income", amount: 100, date: "2026-07-01" });

    const id = created.body.id;
    await pool.query("UPDATE transactions SET is_confirmed=FALSE WHERE id=$1", [id]);

    const res = await request(app).patch(`/api/transactions/${id}/confirm`);
    expect(res.status).toBe(200);

    const { rows } = await pool.query("SELECT is_confirmed FROM transactions WHERE id=$1", [id]);
    expect(rows[0].is_confirmed).toBe(true);
  });

  test("DELETE /api/transactions/:id remove a transação", async () => {
    const res = await request(app).delete(`/api/transactions/${createdId}`);
    expect(res.status).toBe(200);

    const check = await pool.query("SELECT * FROM transactions WHERE id=$1", [createdId]);
    expect(check.rows.length).toBe(0);
  });

  test("DELETE /api/transactions/:id com ID inexistente retorna 404", async () => {
    const res = await request(app).delete("/api/transactions/999999");
    expect(res.status).toBe(404);
  });
});

describe("Reports API", () => {
  test("GET /api/reports/summary retorna estrutura correta", async () => {
    const res = await request(app)
      .get("/api/reports/summary")
      .query({ start: "2026-01-01", end: "2026-12-31" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total_income");
    expect(res.body).toHaveProperty("total_expense");
    expect(res.body).toHaveProperty("balance");
    expect(res.body).toHaveProperty("byCategory");
    expect(res.body).toHaveProperty("daily");
  });
});