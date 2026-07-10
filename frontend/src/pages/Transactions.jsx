import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, confirmTransaction } from "../lib/api";
import TransactionModal from "../components/TransactionModal";
import ConfirmModal from "../components/ConfirmModal";
import useIsMobile from "../hooks/useIsMobile";
import PageSkeleton from "../components/PageSkeleton";
import { getErrorMessage, loadDraft, saveDraft, clearDraft } from "../lib/feedback";

const fmt = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d) => new Date(d).toLocaleDateString("pt-BR");
const fmtDateShort = (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export default function Transactions({ categories, lastDate, onDateChange, triggerNew }) {
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState([]);
  const [modal, setModal]     = useState({ open: false, initial: null });
  const [filters, setFilters] = useState({ start: "", end: "", type: "", category_id: "" });
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState(null);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort]       = useState({ field: "date", dir: "desc" });
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });

  const load = useCallback(async (p = 1) => {
    const preserveScroll = p > 1 && typeof window !== "undefined";
    const currentScroll = preserveScroll ? window.scrollY : 0;

    if (p === 1) setTransactions([]);
    setLoading(true);
    setError(null);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await getTransactions({ ...params, page: p, limit: 50 });
      if (p === 1) setTransactions(res.data);
      else setTransactions(prev => [...prev, ...res.data]);
      setPage(p);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      if (preserveScroll) {
        requestAnimationFrame(() => window.scrollTo({ top: currentScroll, behavior: "auto" }));
      }
    } catch {
      setError("Erro ao carregar transações. O backend está rodando?");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    const draft = loadDraft("finvolt:transactions-draft", null);
    if (draft) {
      setFilters(draft.filters || { start: "", end: "", type: "", category_id: "" });
      setSearch(draft.search || "");
    }
  }, []);

  useEffect(() => {
    saveDraft("finvolt:transactions-draft", { filters, search });
  }, [filters, search]);

  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (triggerNew !== undefined) setModal({ open: true, initial: null });
  }, [triggerNew]);

  const handleSave = async (data) => {
    setSubmitting(true);
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
      clearDraft("finvolt:transactions-draft");
      load(1);
    } catch (error) {
      toast.error(getErrorMessage(error, "Erro ao salvar transação"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => setConfirmModal({ open: true, id });

  const handleConfirmDelete = async () => {
    try {
      await deleteTransaction(confirmModal.id);
      toast.success("Transação excluída");
      load(1);
    } catch (error) {
      toast.error(getErrorMessage(error, "Erro ao excluir transação"));
    } finally {
      setConfirmModal({ open: false, id: null });
    }
  };

  const handleConfirm = async (id) => {
    try {
      await confirmTransaction(id);
      toast.success("Transação confirmada");
      load(1);
    } catch (error) {
      toast.error(getErrorMessage(error, "Erro ao confirmar transação"));
    }
  };

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const toggleSort = (field) => setSort(s => ({ field, dir: s.field === field && s.dir === "desc" ? "asc" : "desc" }));

  const exportCSV = () => {
    const header = ["Data", "Tipo", "Valor", "Categoria", "Descrição", "Status"];
    const rows = filtered.map(t => [
      fmtDate(t.date), t.type === "income" ? "Entrada" : "Gasto",
      Number(t.amount).toFixed(2).replace(".", ","),
      t.category_name || "", t.description || "", t.is_confirmed ? "Confirmada" : "Prevista",
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

  const filtered = transactions.filter(t =>
    !search ||
    (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.category_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const confirmedRaw = filtered.filter(t => t.is_confirmed);
  const projected    = filtered.filter(t => !t.is_confirmed);

  const confirmed = [...confirmedRaw].sort((a, b) => {
    if (sort.field === "date")   return sort.dir === "desc" ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date);
    if (sort.field === "amount") return sort.dir === "desc" ? b.amount - a.amount : a.amount - b.amount;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Transações</h1>
        <div className="flex gap-2">
          {!isMobile && (
            <button onClick={exportCSV}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              Exportar CSV
            </button>
          )}
          <button onClick={() => setModal({ open: true, initial: null })}
            disabled={submitting}
            className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            {submitting ? "Aguarde..." : "+ Nova"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => load(1)} className="text-xs underline hover:text-red-800 shrink-0">Tentar novamente</button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 flex flex-wrap gap-3 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="w-full sm:w-auto">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Buscar</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Descrição ou categoria..."
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full sm:w-52" />
        </div>
        <div className="flex-1 min-w-[120px] sm:flex-none">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">De</label>
          <input type="date" value={filters.start} onChange={e => setFilter("start", e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" />
        </div>
        <div className="flex-1 min-w-[120px] sm:flex-none">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Até</label>
          <input type="date" value={filters.end} onChange={e => setFilter("end", e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full" />
        </div>
        <div className="flex-1 min-w-[100px] sm:flex-none">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Tipo</label>
          <select value={filters.type} onChange={e => setFilter("type", e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full">
            <option value="">Todos</option>
            <option value="income">Entradas</option>
            <option value="expense">Gastos</option>
          </select>
        </div>
        <div className="flex-1 min-w-[120px] sm:flex-none">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Categoria</label>
          <select value={filters.category_id} onChange={e => setFilter("category_id", e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full">
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
        {isMobile && (
          <button onClick={exportCSV}
            className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            Exportar CSV
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Exibindo {confirmed.length} de {total} transações
      </p>

      {/* ─── MOBILE: cards ─── */}
      {isMobile ? (
        <div className="space-y-2">
          {loading && transactions.length === 0 ? (
            <PageSkeleton rows={4} />
          ) : confirmed.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              Nenhuma transação encontrada
            </div>
          ) : (
            confirmed.map(t => (
              <div key={t.id}
                onClick={() => setModal({ open: true, initial: t })}
                className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-200 truncate">
                    {t.description || t.category_name || "—"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{fmtDateShort(t.date)}</span>
                    {t.category_name && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 truncate">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.category_color }} />
                        <span className="truncate">{t.category_name}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    className="text-red-400 hover:text-red-600 p-1 text-sm">
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}

          {projected.length > 0 && (
            <>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium pt-3 px-1">
                Previstas ({projected.length})
              </p>
              {projected.map(t => (
                <div key={t.id}
                  className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-100 dark:border-amber-900 flex items-center justify-between gap-2 opacity-80">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic truncate">
                      {t.description || t.category_name || "—"}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{fmtDateShort(t.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-medium opacity-70 ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
                      {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                    </span>
                    <button onClick={() => handleConfirm(t.id)} className="text-xs text-green-600 font-medium">OK</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        /* ─── DESKTOP/TABLET: tabela ─── */
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden overflow-x-auto">
          {loading && transactions.length === 0 ? (
            <PageSkeleton rows={5} />
          ) : confirmed.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhuma transação encontrada</div>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
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
                {confirmed.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(t.date)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{t.description || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className="px-4 py-3">
                      {t.category_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          <span className="w-2 h-2 rounded-full" style={{ background: t.category_color }} />
                          {t.category_name}
                        </span>
                      ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
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
                        <td className="px-4 py-3 text-gray-400 italic whitespace-nowrap">{fmtDate(t.date)}</td>
                        <td className="px-4 py-3 text-gray-400 italic">{t.description || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3">
                          {t.category_name ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                              <span className="w-2 h-2 rounded-full" style={{ background: t.category_color }} />
                              {t.category_name}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium opacity-60 whitespace-nowrap ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
                          {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleConfirm(t.id)}
                              className="text-xs text-green-600 hover:text-green-800 font-medium">Confirmar</button>
                            <button onClick={() => handleDelete(t.id)}
                              className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Carregar mais */}
      {page < totalPages && (
        <div className="flex justify-center pt-2">
          <button onClick={() => load(page + 1)} disabled={loading}
            className="px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 disabled:opacity-50">
            {loading ? "Carregando..." : `Carregar mais (${total - transactions.length} restantes)`}
          </button>
        </div>
      )}

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