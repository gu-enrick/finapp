import { useState, useEffect } from "react";

function shiftDate(dateStr, unit, amount) {
  const d = new Date(dateStr + "T00:00:00");
  if (unit === "day")   d.setDate(d.getDate() + amount);
  if (unit === "month") d.setMonth(d.getMonth() + amount);
  if (unit === "year")  d.setFullYear(d.getFullYear() + amount);
  return d.toISOString().slice(0, 10);
}

export default function TransactionModal({ open, onClose, onSave, categories, initial, lastDate }) {
  const makeEmpty = () => ({ type: "expense", amount: "", description: "", category_id: "", date: lastDate || new Date().toISOString().slice(0, 10) });
  const [form, setForm] = useState(makeEmpty());

  useEffect(() => {
    setForm(initial ? { ...initial, amount: String(initial.amount) } : makeEmpty());
  }, [initial, open, lastDate]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const shift = (unit, amount) => set("date", shiftDate(form.date, unit, amount));

  const handleSubmit = () => {
    if (!form.amount || !form.date) return alert("Valor e data são obrigatórios");
    onSave({ ...form, amount: parseFloat(form.amount), category_id: form.category_id || null });
  };

  const filtered = categories.filter(c => c.type === form.type || c.type === "both");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{initial ? "Editar" : "Nova"} transação</h2>

        <div className="space-y-3">
          {/* Tipo */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {["expense", "income"].map(t => (
              <button key={t} onClick={() => { set("type", t); set("category_id", ""); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === t ? (t === "expense" ? "bg-red-500 text-white" : "bg-green-500 text-white") : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                {t === "expense" ? "Gasto" : "Entrada"}
              </button>
            ))}
          </div>

          {/* Valor */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Valor (R$)</label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set("amount", e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="0,00" />
          </div>

          {/* Data */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Data</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(form.date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {[
                { label: "-1a", unit: "year",  amt: -1 },
                { label: "-1m", unit: "month", amt: -1 },
                { label: "-1d", unit: "day",   amt: -1 },
                { label: "+1d", unit: "day",   amt:  1 },
                { label: "+1m", unit: "month", amt:  1 },
                { label: "+1a", unit: "year",  amt:  1 },
              ].map(({ label, unit, amt }) => (
                <button key={label} onClick={() => shift(unit, amt)}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                  {label}
                </button>
              ))}
              <button onClick={() => set("date", new Date().toISOString().slice(0, 10))}
                className="px-2.5 py-1 text-xs rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors">
                hoje
              </button>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Categoria</label>
            <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Sem categoria</option>
              {filtered.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Descrição (opcional)</label>
            <input type="text" value={form.description} onChange={e => set("description", e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Ex: Conta de luz de maio" />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
          <button onClick={handleSubmit} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">Salvar</button>
        </div>
      </div>
    </div>
  );
}