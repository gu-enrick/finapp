import { useState } from "react";
import { createCategory, updateCategory, deleteCategory } from "../lib/api";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";
import useIsMobile from "../hooks/useIsMobile";
import { normalizeText, VALIDATION_MESSAGES } from "../lib/validation";

const TYPES = { expense: "Gasto", income: "Entrada", both: "Ambos" };
const COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#94a3b8","#10b981"];
const emptyForm = { name: "", type: "expense", color: "#6366f1" };

export default function Categories({ categories, onReload }) {
  const isMobile = useIsMobile();
  const [form, setForm]       = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const name = normalizeText(form.name);
    if (!name) return toast.error(VALIDATION_MESSAGES.invalidName);

    const existing = categories.find((category) => {
      if (editing && category.id === editing) return false;
      return normalizeText(category.name).toLowerCase() === name.toLowerCase();
    });

    if (existing) return toast.error(VALIDATION_MESSAGES.duplicateCategory);

    try {
      if (editing) {
        await updateCategory(editing, { ...form, name });
        toast.success("Categoria atualizada");
        setEditing(null);
      } else {
        await createCategory({ ...form, name });
        toast.success("Categoria criada");
      }
      setForm(emptyForm);
      setShowForm(false);
      onReload();
    } catch (error) {
      const message = error?.response?.data?.error || "Erro ao salvar categoria";
      toast.error(message);
    }
  };

  const handleEdit = (c) => {
    setEditing(c.id);
    setForm({ name: c.name, type: c.type, color: c.color });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => setConfirmModal({ open: true, id });

  const handleConfirmDelete = async () => {
    try {
      await deleteCategory(confirmModal.id);
      toast.success("Categoria excluída");
      onReload();
    } catch {
      toast.error("Erro ao excluir categoria");
    } finally {
      setConfirmModal({ open: false, id: null });
    }
  };

  const handleCancel = () => { setEditing(null); setForm(emptyForm); setShowForm(false); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Categorias</h1>
        {isMobile && (
          <button onClick={() => { setShowForm(v => !v); if (editing) handleCancel(); }}
            className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            + Nova
          </button>
        )}
      </div>

      {/* Formulário — escondido por padrão em mobile */}
      {(!isMobile || showForm) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">{editing ? "Editar categoria" : "Nova categoria"}</h2>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
            <div className="w-full sm:w-48">
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Nome da categoria"
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" />
            </div>
            <div className="w-full sm:w-auto">
              <select value={form.type} onChange={e => set("type", e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full">
                <option value="expense">Gasto</option>
                <option value="income">Entrada</option>
                <option value="both">Ambos</option>
              </select>
            </div>
            <div className="flex gap-1.5 items-center flex-wrap py-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => set("color", c)}
                  className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 transition-transform shrink-0 ${form.color === c ? "border-gray-800 dark:border-white scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              {editing ? "Salvar alterações" : "Adicionar"}
            </button>
            {(editing || isMobile) && (
              <button onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── MOBILE: cards ─── */}
      {isMobile ? (
        <div className="space-y-2">
          {categories.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              Nenhuma categoria cadastrada
            </div>
          ) : categories.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{TYPES[c.type]}</p>
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => handleEdit(c)} className="text-xs text-indigo-500 hover:text-indigo-700">Editar</button>
                <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:text-red-600">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── DESKTOP: tabela ─── */
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {categories.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma categoria cadastrada</td></tr>
              ) : categories.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                      <span className="text-gray-700 dark:text-gray-200">{c.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{TYPES[c.type]}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleEdit(c)} className="text-xs text-indigo-500 hover:text-indigo-700">Editar</button>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        message="Excluir categoria? As transações vinculadas ficarão sem categoria."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />
    </div>
  );
}