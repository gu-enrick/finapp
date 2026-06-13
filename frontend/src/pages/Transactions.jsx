import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, confirmTransaction } from "../lib/api";
import TransactionModal from "../components/TransactionModal";
import ConfirmModal from "../components/ConfirmModal";

const fmt = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d) => new Date(d).toLocaleDateString("pt-BR");

export default function Transactions({ categories, lastDate, onDateChange, triggerNew }) {
  const [transactions, setTransactions] = useState([]);
  const [modal, setModal]     = useState({ open: false, initial: null });
  const [filters, setFilters] = useState({ start: "", end: "", type: "", category_id: "" });
  const [search, setSearch]   = useState("");
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });
  const [sort, setSort] = useState({ field: "date", dir: "desc" });

  const load = useCallback(async (p = 1) => {
  setLoading(true);
  setError(null);
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await getTransactions({ ...params, page: p, limit: 50 });
    if (p === 1) {
      setTransactions(res.data);
    } else {
      setTransactions(prev => [...prev, ...res.data]);
    }
    setPage(p);
    setTotal(res.total);
    setTotalPages(res.totalPages);
  } catch {
    setError("Erro ao carregar transações. O backend está rodando?");
  } finally {
    setLoading(false);
  }
}, [filters]);

  useEffect(() => { load(1); }, [load]);

  // Atalho N abre modal
  const isFirst = useRef(true);
  useEffect(() => {
    if (triggerNew === undefined) return;
    setModal({ open: true, initial: null });
  }, [triggerNew]);

  const handleSave = async (data) => {
    try {
      if (modal.initial) {
        await updateTransaction(modal.initial.id, data);
        toast.success("Transação atualizada");
      } else {
        await createTransaction(data);
        toast.success("Transação salva");
      }
      onDateChange(data.date);
      setModal({ open: false, initial: null });
      load();
    } catch {
      toast.error("Erro ao salvar transação");
    }
  };

  const handleDelete = async (id) => {
    setConfirmModal({ open: true, id });
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteTransaction(confirmModal.id);
      toast.success("Transação excluída");
      load();
    } catch {
      toast.error("Erro ao excluir transação");
    } finally {
      setConfirmModal({ open: false, id: null });
    }
  };

  // Efetivação de transações previstas
  const handleConfirm = async (id) => {
    try {
      await confirmTransaction(id);
      toast.success("Transação efetivada");
      load();
    } catch {
      toast.error("Erro ao confirmar transação");
    }
  };

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const toggleSort = (field) => {
  setSort(s => ({ field, dir: s.field === field && s.dir === "desc" ? "asc" : "desc" }));
};

const filtered = transactions.filter(t =>
    !search ||
    (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.category_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const confirmed = filtered.filter(t => t.is_confirmed);
  const projected = filtered.filter(t => !t.is_confirmed);

const sortedConfirmed = [...confirmed].sort((a, b) => {
  if (sort.field === "date") {
    return sort.dir === "desc"
      ? new Date(b.date) - new Date(a.date)
      : new Date(a.date) - new Date(b.date);
  }
  if (sort.field === "amount") {
    return sort.dir === "desc" ? b.amount - a.amount : a.amount - b.amount;
  }
  return 0;
});

  const exportCSV = () => {
    const header = ["Data", "Tipo", "Valor", "Categoria", "Descrição", "Status"];
    const rows = filtered.map(t => [
      fmtDate(t.date),
      t.type === "income" ? "Entrada" : "Gasto",
      Number(t.amount).toFixed(2).replace(".", ","),
      t.category_name || "",
      t.description || "",
      t.is_confirmed ? "Confirmada" : "Prevista",
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finapp_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Transações</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Exportar CSV
          </button>
          <button onClick={() => setModal({ open: true, initial: null })}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            + Nova transação
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          {error}
          <button onClick={load} className="text-xs underline hover:text-red-800">Tentar novamente</button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 flex flex-wrap gap-3 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="w-full sm:w-auto">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Buscar</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Descrição ou categoria..."
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-52" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">De</label>
          <input type="date" value={filters.start} onChange={e => setFilter("start", e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Até</label>
          <input type="date" value={filters.end} onChange={e => setFilter("end", e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Tipo</label>
          <select value={filters.type} onChange={e => setFilter("type", e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">Todos</option>
            <option value="income">Entradas</option>
            <option value="expense">Gastos</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Categoria</label>
          <select value={filters.category_id} onChange={e => setFilter("category_id", e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">Todas</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => { setFilters({ start: "", end: "", type: "", category_id: "" }); setSearch(""); }}
            className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            Limpar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhuma transação encontrada</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
                    Data {sort.field === "date" ? (sort.dir === "desc" ? "↓" : "↑") : "↕"}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">Categoria</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <button onClick={() => toggleSort("amount")} className="flex items-center gap-1 ml-auto hover:text-gray-700 dark:hover:text-gray-200">
                    Valor {sort.field === "amount" ? (sort.dir === "desc" ? "↓" : "↑") : "↕"}
                  </button>
                </th>
                <th className="px-4 py-3"></th>
              </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {sortedConfirmed.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(t.date)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{t.description || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-4 py-3">
                    {t.category_name ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <span className="w-2 h-2 rounded-full" style={{ background: t.category_color }} />
                        {t.category_name}
                      </span>
                    ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setModal({ open: true, initial: t })}
                        className="text-xs text-indigo-500 hover:text-indigo-700">Editar</button>
                      <button onClick={() => handleDelete(t.id)}
                        className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}

              {projected.length > 0 && (
                <>
                  <tr className="bg-amber-50 dark:bg-amber-950/30">
                    <td colSpan={5} className="px-4 py-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Previstas ({projected.length}) — clique em confirmar para efetivar
                    </td>
                  </tr>
                  {projected.map(t => (
                    <tr key={t.id} className="bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors opacity-75">
                      <td className="px-4 py-3 text-gray-400 italic">{fmtDate(t.date)}</td>
                      <td className="px-4 py-3 text-gray-400 italic">{t.description || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        {t.category_name ? (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                            <span className="w-2 h-2 rounded-full" style={{ background: t.category_color }} />
                            {t.category_name}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium opacity-60 ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
                        {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleConfirm(t.id)}
                            className="text-xs text-green-600 hover:text-green-800 font-medium">Confirmar</button>
                          <button onClick={() => handleDelete(t.id)}
                            className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                        Exibindo {transactions.filter(t => t.is_confirmed).length} de {total} transações
                        </p>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>
      {page < totalPages && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => load(page + 1)}
            disabled={loading}
            className="px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 disabled:opacity-50"
          >
            {loading ? "Carregando..." : `Carregar mais (${total - transactions.length} restantes)`}
          </button>
        </div>
      )}
      {/* Modais de controle inseridos lado a lado */}
      <ConfirmModal
        open={confirmModal.open}
        message="Excluir esta transação?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />

      <TransactionModal
        open={modal.open}
        onClose={() => setModal({ open: false, initial: null })}
        onSave={handleSave}
        categories={categories}
        initial={modal.initial}
        lastDate={lastDate}
      />
    </div>
  );
}