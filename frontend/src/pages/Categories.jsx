import { useState } from "react";
import { createCategory, updateCategory, deleteCategory } from "../lib/api";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";

const TYPES = { expense: "Gasto", income: "Entrada", both: "Ambos" };
const COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#94a3b8","#10b981"];
const emptyForm = { name: "", type: "expense", color: "#6366f1" };

export default function Categories({ categories, onReload }) {
  const [form, setForm]       = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  
  // 1. Estado para controlar o modal de confirmação
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    try {
      if (editing) {
        await updateCategory(editing, form);
        toast.success("Categoria atualizada");
        setEditing(null);
      } else {
        await createCategory(form);
        toast.success("Categoria criada");
      }
      setForm(emptyForm);
      onReload();
    } catch {
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleEdit = (c) => {
    setEditing(c.id);
    setForm({ name: c.name, type: c.type, color: c.color });
  };

  // 2. Apenas abre o modal e guarda o ID da categoria
  const handleDelete = (id) => {
    setConfirmModal({ open: true, id });
  };

  // 3. Executa a exclusão real no banco de dados
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

  const handleCancel = () => { setEditing(null); setForm(emptyForm); };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Categorias</h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">{editing ? "Editar categoria" : "Nova categoria"}</h2>
        <div className="flex flex-wrap gap-3">
          <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="Nome da categoria"
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48" />
          <select value={form.type} onChange={e => set("type", e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="expense">Gasto</option>
            <option value="income">Entrada</option>
            <option value="both">Ambos</option>
          </select>
          <div className="flex gap-1.5 items-center">
            {COLORS.map(c => (
              <button key={c} onClick={() => set("color", c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${form.color === c ? "border-gray-800 dark:border-white scale-110" : "border-transparent"}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            {editing ? "Salvar alterações" : "Adicionar"}
          </button>
          {editing && (
            <button onClick={handleCancel}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Categoria</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {categories.map(c => (
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

      {/* 4. Componente do Modal Inserido Aqui */}
      <ConfirmModal
        open={confirmModal.open}
        message="Excluir categoria? As transações vinculadas ficarão sem categoria."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />
    </div>
  );
}