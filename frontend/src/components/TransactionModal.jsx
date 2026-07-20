import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getAllCategories } from "../lib/api";
import useIsMobile from "../hooks/useIsMobile";
import { isPositiveNumber, isValidDateString, normalizeText, VALIDATION_MESSAGES } from "../lib/validation";

const getLocalToday = () => {
  const d = new Date();
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
};

function shiftDate(dateStr, unit, amount) {
  const d = new Date(dateStr.split('T')[0] + "T12:00:00");
  if (unit === "day")   d.setDate(d.getDate() + amount);
  if (unit === "month") d.setMonth(d.getMonth() + amount);
  if (unit === "year")  d.setFullYear(d.getFullYear() + amount);
  return d.toISOString().slice(0, 10);
}

export default function TransactionModal({ open, onClose, onSave, categories, initial, lastDate }) {
  const isMobile = useIsMobile();
  const makeEmpty = () => ({ type: "expense", amount: "", description: "", category_id: "", date: lastDate || getLocalToday() });
  const [form, setForm] = useState(makeEmpty());
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    if (initial?.category_id) {
      getAllCategories().then(setAllCategories);
    }
  }, [initial]);

  useEffect(() => {
    setForm(initial ? {
      ...initial,
      amount: String(initial.amount),
      date: initial.date ? initial.date.split("T")[0] : makeEmpty().date,
    } : makeEmpty());
  }, [initial, open, lastDate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !e.shiftKey) handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, form]); 

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const shift = (unit, amount) => set("date", shiftDate(form.date, unit, amount));

  const handleSubmit = () => {
    const description = normalizeText(form.description);
    if (!isPositiveNumber(form.amount)) return toast.error(VALIDATION_MESSAGES.invalidAmount);
    if (!isValidDateString(form.date)) return toast.error(VALIDATION_MESSAGES.invalidDate);
    onSave({ ...form, description, amount: parseFloat(form.amount), category_id: form.category_id || null });
  };

  const sourceCategories = allCategories.length > 0 ? allCategories : categories;
  const filtered = sourceCategories.filter(c => c.type === form.type || c.type === "both");

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
              autoFocus={!isMobile}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="0,00" />
          </div>

          {/* Data */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Data</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              {/* AJUSTE 3: Meio-dia para renderizar a prévia da data */}
              <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(form.date.split('T')[0] + "T12:00:00").toLocaleDateString("pt-BR")}</span>
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
              <button onClick={() => set("date", getLocalToday())}
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
              {filtered.map(c => (<option key={c.id} value={c.id}> {c.name}{c.is_active === false ? " (inativa)" : ""}</option>))}
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