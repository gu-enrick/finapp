process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../server");
const pool = require("../database");

beforeAll(async () => {
  await new Promise(r => setTimeout(r, 500));
  await pool.query("DELETE FROM transactions");
  await pool.query("DELETE FROM recurrences");
  await pool.query("DELETE FROM goals");
  await pool.query("DELETE FROM categories");
});

afterAll(async () => {
  await pool.end();
});

describe("Categories API", () => {
  let createdId;

  test("POST /api/categories cria categoria válida", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "Lazer", type: "expense", color: "#a855f7" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("Lazer");
    expect(res.body.is_active).toBe(true);
    createdId = res.body.id;
  });

  test("POST /api/categories rejeita type inválido", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "Inválida", type: "qualquer_coisa" });

    expect(res.status).toBe(400);
  });

  test("POST /api/categories rejeita cor em formato inválido", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "CorRuim", type: "expense", color: "vermelho" });

    expect(res.status).toBe(400);
  });

  test("POST /api/categories rejeita nome vazio", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "", type: "expense" });

    expect(res.status).toBe(400);
  });

  test("POST /api/categories rejeita nome duplicado", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "Lazer", type: "expense" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Categoria já existe");
  });

  test("GET /api/categories retorna apenas categorias ativas", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.every(c => c.is_active !== false)).toBe(true);
  });

  test("GET /api/categories/all retorna todas, incluindo inativas", async () => {
    await request(app).delete(`/api/categories/${createdId}`);
    const res = await request(app).get("/api/categories/all");
    const found = res.body.find(c => c.id === createdId);
    expect(found).toBeDefined();
    expect(found.is_active).toBe(false);
  });

  test("DELETE /api/categories/:id faz soft delete (não remove do banco)", async () => {
    const check = await pool.query("SELECT * FROM categories WHERE id=$1", [createdId]);
    expect(check.rows.length).toBe(1);
    expect(check.rows[0].is_active).toBe(false);
  });

  test("GET /api/categories não retorna a categoria desativada", async () => {
    const res = await request(app).get("/api/categories");
    const found = res.body.find(c => c.id === createdId);
    expect(found).toBeUndefined();
  });

  test("PUT /api/categories/:id com ID inexistente retorna 404", async () => {
    const res = await request(app)
      .put("/api/categories/999999")
      .send({ name: "Teste", type: "expense" });

    expect(res.status).toBe(404);
  });

  test("Transações antigas mantêm nome/cor mesmo após categoria ser desativada", async () => {
    // recria uma categoria ativa pra testar
    const cat = await request(app)
      .post("/api/categories")
      .send({ name: "TempCat", type: "expense", color: "#ef4444" });

    const tx = await request(app)
      .post("/api/transactions")
      .send({ type: "expense", amount: 50, category_id: cat.body.id, date: "2026-06-15" });

    await request(app).delete(`/api/categories/${cat.body.id}`);

    const list = await request(app).get("/api/transactions").query({ limit: 50 });
    const found = list.body.data.find(t => t.id === tx.body.id);

    expect(found).toBeDefined();
    expect(found.category_name).toBe("TempCat");
  });
});