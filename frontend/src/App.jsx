import { useState, useEffect } from "react";
import { getCategories } from "./lib/api";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Categories from "./pages/Categories";
import Recurrences from "./pages/Recurrences";
import Goals from "./pages/Goals";
import useIsMobile from "./hooks/useIsMobile";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import supabase from "./lib/supabase";

const NAV = [
  { id: "dashboard",    label: "Dashboard",    key: "1", icon: "🏠" },
  { id: "transactions", label: "Transações",   key: "2", icon: "💳" },
  { id: "reports",      label: "Relatórios",   key: "3", icon: "📊" },
  { id: "recurrences",  label: "Recorrências", key: "4", icon: "🔁" },
  { id: "goals",        label: "Metas",        key: "5", icon: "🎯" },
  { id: "categories",   label: "Categorias",   key: "6", icon: "🏷️" },
  { id: "profile", label: "Perfil", key: "7", icon: "👤" },
];

const MOBILE_PRIMARY = ["dashboard", "transactions", "reports", "goals"];
const MOBILE_MORE    = ["recurrences", "categories", "profile"];

export default function App() {
  const isMobile = useIsMobile();
  const [page, setPage]             = useState("dashboard");
  const [categories, setCategories] = useState([]);
  const [lastDate, setLastDate]     = useState(new Date().toISOString().slice(0, 10));
  const [dark, setDark]             = useState(() => localStorage.getItem("theme") === "dark");
  const [newTx, setNewTx]           = useState(undefined);
  const [moreOpen, setMoreOpen]     = useState(false);
  const [user, setUser]             = useState(undefined); // undefined = carregando, null = demo, objeto = logado

  const loadCategories = async () => setCategories(await getCategories());
  useEffect(() => { loadCategories(); }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable;
      if (isEditable) return;
      if (e.target.closest("[role='dialog']")) return;
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

  const goToPage = (id) => { setPage(id); setMoreOpen(false); };

  if (user === undefined) return (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
    <span className="text-gray-400 text-sm">Carregando...</span>
  </div>
    );
  if (user === null && import.meta.env.VITE_DEMO_MODE !== "true") {
      return <Login onLogin={setUser} />;
    }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {import.meta.env.VITE_DEMO_MODE === "true" && (
        <div className="bg-amber-500 text-white text-xs text-center py-2 px-4 font-medium">
          🔒 Modo demonstração — alterações não são salvas. Clone o repositório para uso pessoal.
        </div>
      )}

      {!isMobile && (
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
              
              {user && (
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); }}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors px-2">
                  Sair
                </button>
              )}

              <button onClick={() => setDark(d => !d)}
                title="Alternar tema (D)"
                className="ml-2 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-base">
                {dark ? "☀️" : "🌙"}
              </button>
            </nav>
          </div>
        </header>
      )}

      {isMobile && (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm sticky top-0 z-40">
          <div className="px-4 flex items-center justify-between h-12">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base tracking-tight">finapp</span>
            
            <div className="flex items-center gap-1">
              {user && (
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); }}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 px-2">
                  Sair
                </button>
              )}

              <button onClick={() => setDark(d => !d)}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 text-base">
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={`max-w-5xl mx-auto px-4 py-6 ${isMobile ? "pb-24" : ""}`}>
        {page === "dashboard"    && <Dashboard onNavigate={setPage} />}
        {page === "transactions" && <Transactions categories={categories} lastDate={lastDate} onDateChange={setLastDate} triggerNew={newTx} />}
        {page === "reports"      && <Reports />}
        {page === "recurrences"  && <Recurrences categories={categories} />}
        {page === "goals"        && <Goals categories={categories} />}
        {page === "categories"   && <Categories categories={categories} onReload={loadCategories} />}
        {page === "profile" && <Profile user={user} onLogout={() => setUser(null)} />}
      </main>

      {/* Menu "Mais" — mobile */}
      {isMobile && moreOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setMoreOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 w-full rounded-t-2xl p-4 pb-8 space-y-1 animate-in slide-in-from-bottom">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3" />
            {MOBILE_MORE.map(id => {
              const n = NAV.find(x => x.id === id);
              return (
                <button key={id} onClick={() => goToPage(id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                    page === id ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>
                  <span className="text-lg">{n.icon}</span>
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-around py-2 z-40">
          {MOBILE_PRIMARY.map(id => {
            const n = NAV.find(x => x.id === id);
            return (
              <button key={id} onClick={() => goToPage(id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
                  page === id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
                }`}>
                <span className="text-lg leading-none">{n.icon}</span>
                {n.label}
              </button>
            );
          })}
          <button onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
              MOBILE_MORE.includes(page) ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
            }`}>
            <span className="text-lg leading-none">⋯</span>
            Mais
          </button>
        </nav>
      )}

      {!isMobile && (
        <div className="fixed bottom-4 left-4 text-xs text-gray-300 dark:text-gray-700 select-none">
          1-6 navegar · N nova transação · D tema
        </div>
      )}
    </div>
  );
}