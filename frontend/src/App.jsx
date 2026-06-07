import { useState, useEffect } from "react";
import { getCategories } from "./lib/api";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Categories from "./pages/Categories";
import Recurrences from "./pages/Recurrences";
import Goals from "./pages/Goals";

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

  const loadCategories = async () => setCategories(await getCategories());
  useEffect(() => { loadCategories(); }, []);

  // Tema escuro
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Atalhos de teclado
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      const nav = NAV.find(n => n.key === e.key);
      if (nav) { setPage(nav.id); return; }
      if (e.key === "n" || e.key === "N") { setPage("transactions"); setNewTx(t => !t); }
      if (e.key === "d" || e.key === "D") { setDark(d => !d); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
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

      <main className="max-w-5xl mx-auto px-4 py-6">
        {page === "dashboard"    && <Dashboard onNavigate={setPage} />}
        {page === "transactions" && <Transactions categories={categories} lastDate={lastDate} onDateChange={setLastDate} triggerNew={newTx} />}
        {page === "reports"      && <Reports />}
        {page === "recurrences"  && <Recurrences categories={categories} />}
        {page === "goals"        && <Goals categories={categories} />}
        {page === "categories"   && <Categories categories={categories} onReload={loadCategories} />}
      </main>

      {/* Dica de atalhos */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-300 dark:text-gray-700 select-none">
        1-6 navegar · N nova transação · D tema
      </div>
    </div>
  );
}