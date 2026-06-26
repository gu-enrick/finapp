import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getRecurrences, createRecurrence, deleteRecurrence, generateRecurrence, updateRecurrence } from "../lib/api";
import ConfirmModal from "../components/ConfirmModal";
import RecurrenceModal from "../components/RecurrenceModal";
import useIsMobile from "../hooks/useIsMobile";

const fmt = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const FREQ = { weekly: "Semanal", monthly: "Mensal", yearly: "Anual" };
const emptyForm = { type: "expense", amount: "", description: "", category_id: "", frequency: "monthly", start_date: new Date().toISOString().slice(0, 10) };

export default function Recurrences({ categories }) {
  const isMobile = useIsMobile();
  const [recurrences, setRecurrences] = useState([]);
  const [form, setForm]               = useState(emptyForm);
  const [generating, setGenerating]   = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });
  const [editModal, setEditModal]     = useState({ open: false, initial: null });
  const [showForm, setShowForm]       = useState(false);

  const load = async () => setRecurrences(await getRecurrences());
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.amount || !form.start_date) return toast.error("Valor e data são obrigatórios");
    try {
      await createRecurrence({
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id ? parseInt(form.category_id) : null,
      });
      toast.success("Recorrência criada");
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch {
      toast.error("Erro ao criar recorrência");
    }
  };

  const handleEdit = async (data) => {
    try {
      await updateRecurrence(editModal.initial.id, data);
      toast.success("Recorrência atualizada");
      setEditModal({ open: false, initial: null });
      load();
    } catch {
      toast.error("Erro ao atualizar recorrência");
    }
  };

  const handleDelete = (id) => setConfirmModal({ open: true, id });

  const handleConfirmDelete = async () => {
    try {
      await deleteRecurrence(confirmModal.id);
      toast.success("Recorrência excluída");
      load();
    } catch {
      toast.error("Erro ao excluir recorrência");
    } finally {
      setConfirmModal({ open: false, id: null });
    }
  };

  const handleGenerate = async (id, opts) => {
    setGenerating(id);
    try {
      const result = await generateRecurrence(id, opts);
      toast.success(`${result.generated} ocorrências geradas`);
    } catch {
      toast.error("Erro ao gerar ocorrências");
    } finally {
      setGenerating(null);
    }
  };

  const filteredCats = (type) => categories.filter(c => c.type === type || c.type === "both");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Recorrências</h1>
        {isMobile && (
          <button onClick={() => setShowForm(v => !v)}
            className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            + Nova
          </button>
        )}
      </div>

      {(!isMobile || showForm) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
          {!isMobile && <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Nova recorrência</h2>}

          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-fit">
            {["expense", "income"].map(t => (
              <button key={t} onClick={() => { set("type", t); set("category_id", ""); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${form.type === t ? (t === "expense" ? "bg-red-500 text-white" : "bg-green-500 text-white") : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                {t === "expense" ? "Gasto" : "Entrada"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
            <div className="col-span-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Valor (R$)</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set("amount", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" placeholder="0,00" />
            </div>
            <div className="col-span-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Frequência</label>
              <select value={form.frequency} onChange={e => set("frequency", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full">
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Data de início</label>
              <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Categoria</label>
              <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full">
                <option value="">Sem categoria</option>
                {filteredCats(form.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Descrição (opcional)</label>
              <input type="text" value={form.description} onChange={e => set("description", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" placeholder="Ex: Netflix" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Adicionar
            </button>
            {isMobile && (
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── MOBILE: cards ─── */}
      {isMobile ? (
        <div className="space-y-2">
          {recurrences.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              Nenhuma recorrência cadastrada
            </div>
          ) : recurrences.map(r => (
            <div key={r.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {r.description || <span className="text-gray-400 italic">Sem descrição</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {r.category_name && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.category_color }} />
                        {r.category_name}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{FREQ[r.frequency]}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      desde {new Date(r.start_date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button onClick={() => setEditModal({ open: true, initial: r })}
                      className="text-xs text-indigo-500 hover:text-indigo-700">Editar</button>
                    <button onClick={() => handleGenerate(r.id, { count: 12 })} disabled={generating === r.id}
                      className="text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-50">Gerar 12x</button>
                    <button onClick={() => handleGenerate(r.id, { until_end_of_year: true })} disabled={generating === r.id}
                      className="text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-50">Até fim do ano</button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-sm font-semibold ${r.type === "income" ? "text-green-600" : "text-red-500"}`}>
                    {r.type === "income" ? "+" : "-"}{fmt(r.amount)}
                  </span>
                  <button onClick={() => handleDelete(r.id)}
                    className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── DESKTOP: tabela ─── */
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden overflow-x-auto">
          {recurrences.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhuma recorrência cadastrada</div>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Frequência</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Início</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {recurrences.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{r.description || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className="px-4 py-3">
                      {r.category_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          <span className="w-2 h-2 rounded-full" style={{ background: r.category_color }} />
                          {r.category_name}
                        </span>
                      ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{FREQ[r.frequency]}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(r.start_date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${r.type === "income" ? "text-green-600" : "text-red-500"}`}>
                      {r.type === "income" ? "+" : "-"}{fmt(r.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <button onClick={() => setEditModal({ open: true, initial: r })}
                          className="text-xs text-indigo-500 hover:text-indigo-700">Editar</button>
                        <button onClick={() => handleGenerate(r.id, { count: 12 })} disabled={generating === r.id}
                          className="text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-50">Gerar 12x</button>
                        <button onClick={() => handleGenerate(r.id, { until_end_of_year: true })} disabled={generating === r.id}
                          className="text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-50">Até fim do ano</button>
                        <button onClick={() => handleDelete(r.id)}
                          className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <RecurrenceModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, initial: null })}
        onSave={handleEdit}
        categories={categories}
        initial={editModal.initial}
      />

      <ConfirmModal
        open={confirmModal.open}
        message="Excluir recorrência e todas as ocorrências previstas?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />
    </div>
  );
}