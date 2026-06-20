import { useState, useEffect } from "react";
import { getCategories, getMode, setMode as saveMode, resetLocalData } from "./lib/api";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Categories from "./pages/Categories";
import Recurrences from "./pages/Recurrences";
import Goals from "./pages/Goals";
import ConfirmModal from "./components/ConfirmModal";
import toast from "react-hot-toast";

const NAV = [
  { id: "dashboard",    label: "Dashboard",    key: "1" },
  { id: "transactions", label: "Transações",   key: "2" },
  { id: "reports",      label: "Relatórios",   key: "3" },
  { id: "recurrences",  label: "Recorrências", key: "4" },
  { id: "goals",        label: "Metas",        key: "5" },
  { id: "categories",   label: "Categorias",   key: "6" },
];

export default function App() {
  const [page, setPage]             = useState("dashboard");
  const [categories, setCategories] = useState([]);
  const [lastDate, setLastDate]     = useState(new Date().toISOString().slice(0, 10));
  const [dark, setDark]             = useState(() => localStorage.getItem("theme") === "dark");
  const [newTx, setNewTx]           = useState(undefined);
  const [mode, setModeState]        = useState(getMode());
  const [reloadKey, setReloadKey]   = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  const loadCategories = async () => setCategories(await getCategories());
  useEffect(() => { loadCategories(); }, [mode, reloadKey]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      const nav = NAV.find(n => n.key === e.key);
      if (nav) { setPage(nav.id); return; }
      if (e.key === "n" || e.key === "N") {
        if (page === "transactions") setNewTx(t => !t);
        else setPage("transactions");
      }
      if (e.key === "d" || e.key === "D") { setDark(d => !d); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page]);

  const handleModeSwitch = (newMode) => {
    if (newMode === mode) return;
    if (newMode === "local") {
      resetLocalData();
    }
    saveMode(newMode);
    setModeState(newMode);
    setPage("dashboard");
    setReloadKey(k => k + 1);
  };

  const handleResetLocal = () => setConfirmReset(true);

const confirmResetData = () => {
  resetLocalData();
  setReloadKey(k => k + 1);
  setConfirmReset(false);
  toast.success("Dados locais reiniciados");
};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className={`text-white text-xs text-center py-2 px-4 font-medium flex items-center justify-center gap-3 flex-wrap ${mode === "local" ? "bg-indigo-600" : "bg-amber-500"}`}>
        {mode === "local" ? (
          <>
            💾 Modo local — seus dados ficam só neste navegador
            <button onClick={handleResetLocal} className="underline hover:no-underline">Reiniciar dados</button>
          </>
        ) : (
          <>🔒 Modo demonstração — dados fictícios, alterações não são salvas</>
        )}
        <div className="flex rounded-full overflow-hidden border border-white/40 ml-2">
          <button onClick={() => handleModeSwitch("server")}
            className={`px-2.5 py-0.5 text-[11px] ${mode === "server" ? "bg-white/90 text-gray-800 font-semibold" : "text-white/80"}`}>
            Demo
          </button>
          <button onClick={() => handleModeSwitch("local")}
            className={`px-2.5 py-0.5 text-[11px] ${mode === "local" ? "bg-white/90 text-gray-800 font-semibold" : "text-white/80"}`}>
            Local
          </button>
        </div>
        <ConfirmModal
          open={confirmReset}
          message="Apagar todos os dados locais e recomeçar do zero?"
          onConfirm={confirmResetData}
          onCancel={() => setConfirmReset(false)}
        />
      </div>

      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg tracking-tight">finapp</span>
          <nav className="flex gap-1 items-center">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)}
                title={`Atalho: ${n.key}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === n.id
                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                {n.label}
              </button>
            ))}
            <button onClick={() => setDark(d => !d)}
              title="Alternar tema (D)"
              className="ml-2 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-base">
              {dark ? "☀️" : "🌙"}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6" key={reloadKey}>
        {page === "dashboard"    && <Dashboard onNavigate={setPage} />}
        {page === "transactions" && <Transactions categories={categories} lastDate={lastDate} onDateChange={setLastDate} triggerNew={newTx} />}
        {page === "reports"      && <Reports />}
        {page === "recurrences"  && <Recurrences categories={categories} />}
        {page === "goals"        && <Goals categories={categories} />}
        {page === "categories"   && <Categories categories={categories} onReload={loadCategories} />}
      </main>

      <div className="fixed bottom-4 left-4 text-xs text-gray-300 dark:text-gray-700 select-none">
        1-6 navegar · N nova transação · D tema
      </div>
    </div>
  );
}