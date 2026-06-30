import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getGoals, createGoal, updateGoal, deleteGoal } from "../lib/api";
import ConfirmModal from "../components/ConfirmModal";
import useIsMobile from "../hooks/useIsMobile";

const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const KINDS = {
  savings:        { label: "Meta de economia",     desc: "Valor a guardar no período" },
  category_limit: { label: "Limite por categoria", desc: "Teto de gasto numa categoria" },
  balance:        { label: "Meta de saldo",        desc: "Saldo mínimo ao fim do período" },
};

const emptyForm = { kind: "savings", label: "", amount: "", category_id: "" };

function ProgressBar({ percent, exceeded }) {
  const color = exceeded ? "bg-red-500" : percent >= 90 ? "bg-amber-400" : "bg-indigo-500";
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}

function GoalCard({ goal, onDelete, onEdit }) {
  const isLimit  = goal.kind === "category_limit";
  const exceeded = goal.exceeded;
  const percent  = goal.percent || 0;

  const statusColor = exceeded ? "text-red-500" : percent >= 90 ? "text-amber-500" : "text-indigo-600 dark:text-indigo-400";
  const statusText  = exceeded
    ? `Estourado em ${fmt(goal.current - goal.amount)}`
    : percent >= 90 ? "Atenção — perto do limite"
    : isLimit ? `${fmt(goal.amount - goal.current)} restante`
    : `${fmt(goal.current)} de ${fmt(goal.amount)}`;

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border ${exceeded ? "border-red-200 dark:border-red-800" : "border-gray-100 dark:border-gray-800"}`}>
      {/* Header do card — título + ações */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{goal.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0">
            {KINDS[goal.kind].label}
          </span>
          {goal.category_name && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shrink-0">
              <span className="w-2 h-2 rounded-full" style={{ background: goal.category_color }} />
              {goal.category_name}
            </span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onEdit(goal)} className="text-xs text-indigo-500 hover:text-indigo-700">Editar</button>
          <button onClick={() => onDelete(goal.id)} className="text-xs text-red-400 hover:text-red-600">Excluir</button>
        </div>
      </div>

      {/* Progresso */}
      <div className="flex items-end justify-between mt-2">
        <div className="min-w-0">
          <p className={`text-base sm:text-lg font-semibold ${statusColor}`}>
            {fmt(goal.current)}
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / {fmt(goal.amount)}</span>
          </p>
          <p className={`text-xs mt-0.5 ${statusColor}`}>{statusText}</p>
        </div>
        <span className={`text-sm font-medium ${statusColor} shrink-0 ml-2`}>{percent.toFixed(0)}%</span>
      </div>
      <ProgressBar percent={percent} exceeded={exceeded} />
    </div>
  );
}

export default function Goals({ categories }) {
  const isMobile = useIsMobile();
  const [goals, setGoals]     = useState([]);
  const [form, setForm]       = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });
  const [period, setPeriod]   = useState(() => {
    const n = new Date();
    return {
      start: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`,
      end: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`,
    };
  });

  const load = async () => setGoals(await getGoals(period));
  useEffect(() => { load(); }, [period]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.label || !form.amount) return toast.error("Label e valor são obrigatórios");
    if (form.kind === "category_limit" && !form.category_id) return toast.error("Selecione uma categoria");
    try {
      const data = {
        kind: form.kind, label: form.label,
        amount: parseFloat(form.amount),
        category_id: form.category_id ? parseInt(form.category_id) : null,
      };
      if (editing) {
        await updateGoal(editing, data);
        toast.success("Meta atualizada");
        setEditing(null);
      } else {
        await createGoal(data);
        toast.success("Meta criada");
      }
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch {
      toast.error("Erro ao salvar meta");
    }
  };

  const handleEdit = (g) => {
    setEditing(g.id);
    setForm({ kind: g.kind, label: g.label, amount: String(g.amount), category_id: g.category_id || "" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => setConfirmModal({ open: true, id });

  const handleConfirmDelete = async () => {
    try {
      await deleteGoal(confirmModal.id);
      toast.success("Meta excluída");
      load();
    } catch {
      toast.error("Erro ao excluir meta");
    } finally {
      setConfirmModal({ open: false, id: null });
    }
  };

  const expenseCategories = categories.filter(c => c.type === "expense" || c.type === "both");
  const savings = goals.filter(g => g.kind === "savings");
  const limits  = goals.filter(g => g.kind === "category_limit");
  const balance = goals.filter(g => g.kind === "balance");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Metas</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Período — empilha em mobile */}
          <div className={`flex gap-2 ${isMobile ? "flex-col w-full" : "items-center"}`}>
            <div className={`flex gap-2 ${isMobile ? "w-full" : ""}`}>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">De</label>
                <input type="date" value={period.start}
                  onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Até</label>
                <input type="date" value={period.end}
                  onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" />
              </div>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => { setShowForm(v => !v); setEditing(null); setForm(emptyForm); }}
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 w-full">
              + Nova meta
            </button>
          )}
        </div>
      </div>

      {/* Formulário */}
      {(!isMobile || showForm) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">{editing ? "Editar meta" : "Nova meta"}</h2>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
            <div className="w-full sm:w-auto">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Tipo</label>
              <select value={form.kind} onChange={e => set("kind", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full">
                {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="w-full sm:w-48">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Nome</label>
              <input type="text" value={form.label} onChange={e => set("label", e.target.value)}
                placeholder={KINDS[form.kind].desc}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" />
            </div>
            <div className="w-full sm:w-36">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Valor (R$)</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set("amount", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full"
                placeholder="0,00" />
            </div>
            {form.kind === "category_limit" && (
              <div className="w-full sm:w-auto">
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Categoria</label>
                <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full">
                  <option value="">Selecionar...</option>
                  {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              {editing ? "Salvar" : "Adicionar"}
            </button>
            {(editing || isMobile) && (
              <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(false); }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de metas */}
      {goals.length === 0 ? (
        <div className="text-center text-gray-400 py-12 text-sm">Nenhuma meta cadastrada</div>
      ) : (
        <div className="space-y-5">
          {savings.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Economia</h2>
              <div className="space-y-3">{savings.map(g => <GoalCard key={g.id} goal={g} onDelete={handleDelete} onEdit={handleEdit} />)}</div>
            </div>
          )}
          {limits.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Limites por categoria</h2>
              <div className="space-y-3">{limits.map(g => <GoalCard key={g.id} goal={g} onDelete={handleDelete} onEdit={handleEdit} />)}</div>
            </div>
          )}
          {balance.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Saldo mínimo</h2>
              <div className="space-y-3">{balance.map(g => <GoalCard key={g.id} goal={g} onDelete={handleDelete} onEdit={handleEdit} />)}</div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        message="Excluir esta meta?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />
    </div>
  );
}