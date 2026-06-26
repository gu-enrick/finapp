import { useState, useEffect } from "react";

const emptyForm = {
  type: "expense", amount: "", description: "",
  category_id: "", frequency: "monthly",
  start_date: new Date().toISOString().slice(0, 10)
};

export default function RecurrenceModal({ open, onClose, onSave, categories, initial }) {
  const [form, setForm]           = useState(emptyForm);
  const [propagate, setPropagate] = useState(true);

  useEffect(() => {
    if (initial) {
      setForm({
        type:        initial.type,
        amount:      String(initial.amount),
        description: initial.description || "",
        category_id: initial.category_id || "",
        frequency:   initial.frequency,
        start_date:  new Date(initial.start_date).toISOString().slice(0, 10),
      });
    } else {
      setForm(emptyForm);
    }
    setPropagate(true);
  }, [initial, open]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const filtered = categories.filter(c => c.type === form.type || c.type === "both");

  const handleSubmit = () => {
    if (!form.amount || !form.start_date) return;
    onSave({
      ...form,
      amount:      parseFloat(form.amount),
      category_id: form.category_id ? parseInt(form.category_id) : null,
      propagate,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Editar recorrência
        </h2>

        <div className="space-y-3">
          {/* Tipo */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {["expense", "income"].map(t => (
              <button key={t} onClick={() => { set("type", t); set("category_id", ""); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.type === t
                    ? (t === "expense" ? "bg-red-500 text-white" : "bg-green-500 text-white")
                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}>
                {t === "expense" ? "Gasto" : "Entrada"}
              </button>
            ))}
          </div>

          {/* Valor */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Valor (R$)</label>
            <input type="number" step="0.01" min="0" value={form.amount}
              onChange={e => set("amount", e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="0,00" />
          </div>

          {/* Frequência */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Frequência</label>
            <select value={form.frequency} onChange={e => set("frequency", e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          {/* Data base */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Data de início</label>
            <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
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
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Ex: Netflix" />
          </div>

          {/* Propagação */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={propagate} onChange={e => setPropagate(e.target.checked)}
                className="mt-0.5 accent-indigo-600" />
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                  Atualizar ocorrências futuras previstas
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  As ocorrências já confirmadas não serão alteradas.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancelar
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}