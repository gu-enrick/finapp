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
    "INSERT INTO categories (name, type, color) VALUES ('Assinatura', 'expense', '#8b5cf6') RETURNING id"
  );
  categoryId = rows[0].id;
});

afterAll(async () => {
  await pool.end();
});

describe("Recurrences API", () => {
  let recurrenceId;

  test("POST /api/recurrences cria recorrência válida", async () => {
    const res = await request(app)
      .post("/api/recurrences")
      .send({
        type: "expense",
        amount: 45.9,
        description: "Netflix",
        category_id: categoryId,
        frequency: "monthly",
        start_date: "2026-01-31", // dia 31 — testa overflow de mês
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    recurrenceId = res.body.id;
  });

  test("POST /api/recurrences rejeita frequência inválida", async () => {
    const res = await request(app)
      .post("/api/recurrences")
      .send({
        type: "expense", amount: 10,
        frequency: "diaria", // inválido
        start_date: "2026-01-01",
      });
    expect(res.status).toBe(400);
  });

  test("GET /api/recurrences lista recorrências", async () => {
    const res = await request(app).get("/api/recurrences");
    expect(res.status).toBe(200);
    expect(res.body.some(r => r.id === recurrenceId)).toBe(true);
  });

  test("POST /api/recurrences/:id/generate gera ocorrências sem pular mês (bug de overflow)", async () => {
    const res = await request(app)
      .post(`/api/recurrences/${recurrenceId}/generate`)
      .send({ count: 4 });

    expect(res.status).toBe(200);
    expect(res.body.generated).toBe(4);

    const { rows } = await pool.query(
      "SELECT date FROM transactions WHERE recurrence_id=$1 ORDER BY date",
      [recurrenceId]
    );

    const months = rows.map(r => new Date(r.date).getUTCMonth());
    // espera meses consecutivos: jan(0), fev(1), mar(2), abr(3) — sem pular nenhum
    expect(months).toEqual([0, 1, 2, 3]);
  });

  test("Ocorrências geradas têm is_confirmed = false", async () => {
    const { rows } = await pool.query(
      "SELECT is_confirmed FROM transactions WHERE recurrence_id=$1",
      [recurrenceId]
    );
    expect(rows.every(r => r.is_confirmed === false)).toBe(true);
  });

  test("Gerar novamente substitui as ocorrências previstas antigas (não duplica)", async () => {
    await request(app)
      .post(`/api/recurrences/${recurrenceId}/generate`)
      .send({ count: 2 });

    const { rows } = await pool.query(
      "SELECT * FROM transactions WHERE recurrence_id=$1 AND is_confirmed=FALSE",
      [recurrenceId]
    );
    expect(rows.length).toBe(2);
  });

  test("PUT /api/recurrences/:id atualiza metadados", async () => {
    const res = await request(app)
      .put(`/api/recurrences/${recurrenceId}`)
      .send({
        type: "expense", amount: 55.9, description: "Netflix Premium",
        category_id: categoryId, frequency: "monthly", start_date: "2026-01-31",
        propagate: false,
      });
    expect(res.status).toBe(200);

    const { rows } = await pool.query("SELECT amount, description FROM recurrences WHERE id=$1", [recurrenceId]);
    expect(parseFloat(rows[0].amount)).toBe(55.9);
    expect(rows[0].description).toBe("Netflix Premium");
  });

  test("Confirmar uma ocorrência prevista a torna imune à exclusão da recorrência", async () => {
    const { rows } = await pool.query(
      "SELECT id FROM transactions WHERE recurrence_id=$1 AND is_confirmed=FALSE LIMIT 1",
      [recurrenceId]
    );
    const txId = rows[0].id;

    await request(app).patch(`/api/transactions/${txId}/confirm`);
    await request(app).delete(`/api/recurrences/${recurrenceId}`);

    const check = await pool.query("SELECT * FROM transactions WHERE id=$1", [txId]);
    expect(check.rows.length).toBe(1); // ainda existe
    expect(check.rows[0].is_confirmed).toBe(true);
  });

  test("Excluir recorrência remove apenas as previstas, não as confirmadas", async () => {
    const { rows } = await pool.query(
      "SELECT * FROM transactions WHERE recurrence_id=$1 AND is_confirmed=FALSE",
      [recurrenceId]
    );
    expect(rows.length).toBe(0);
  });

  test("DELETE /api/recurrences/:id com ID inexistente retorna 404", async () => {
    const res = await request(app).delete("/api/recurrences/999999");
    expect(res.status).toBe(404);
  });
});