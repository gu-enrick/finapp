import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getCategories } from "./lib/api";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Categories from "./pages/Categories";
import Recurrences from "./pages/Recurrences";
import Goals from "./pages/Goals";
import useIsMobile from "./hooks/useIsMobile";
import Profile from "./pages/Profile";
import ConsentScreen from "./pages/ConsentScreen";
import supabase, { getResetPasswordRedirect } from "./lib/supabase";
import { isValidEmail, normalizeText, VALIDATION_MESSAGES } from "./lib/validation";

const NAV = [
  { id: "dashboard",    label: "Dashboard",    key: "1", icon: "🏠" },
  { id: "transactions", label: "Transações",   key: "2", icon: "💳" },
  { id: "reports",      label: "Relatórios",   key: "3", icon: "📊" },
  { id: "recurrences",  label: "Recorrências", key: "4", icon: "🔁" },
  { id: "goals",        label: "Metas",        key: "5", icon: "🎯" },
  { id: "categories",   label: "Categorias",   key: "6", icon: "🏷️" },
  { id: "profile",      label: "Perfil",       key: "7", icon: "👤" },
];

const MOBILE_PRIMARY = ["dashboard", "transactions", "reports", "goals"];
const MOBILE_MORE    = ["recurrences", "categories", "profile"];
const ALL_SWIPEABLE  = [...MOBILE_PRIMARY]; // só as 4 principais têm swipe

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanedEmail = normalizeText(email);
    const cleanedPassword = normalizeText(password);

    if (!cleanedEmail || !isValidEmail(cleanedEmail)) {
      setError(VALIDATION_MESSAGES.invalidEmail);
      return;
    }
    if (mode !== "forgot" && cleanedPassword.length < 6) {
      setError(VALIDATION_MESSAGES.invalidPassword);
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanedEmail, password: cleanedPassword });
        if (error) throw error;
        onLogin(data.user);
      } else if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email: cleanedEmail, password: cleanedPassword });
        if (error) throw error;
        if (data.user && !data.user.confirmed_at) {
          setMessage("Confirmação enviada para o seu e-mail. Verifique a caixa de entrada.");
          setMode("login");
        } else {
          onLogin(data.user);
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail, {
          redirectTo: getResetPasswordRedirect(),
        });
        if (error) throw error;
        setMessage("Link de recuperação enviado. Verifique seu e-mail.");
      }
    } catch (err) {
      const rawMessage = err?.message || "";
      const errorCode = err?.status || err?.code || "";
      const messages = {
        "Invalid login credentials": "E-mail ou senha incorretos.",
        "Email not confirmed": "Confirme seu e-mail antes de entrar.",
        "User already registered": "Este e-mail já está cadastrado.",
        "Password should be at least 6 characters": VALIDATION_MESSAGES.invalidPassword,
      };
      const fallbackMessage =
        errorCode === "user_not_found" || rawMessage.includes("user_not_found") || rawMessage.includes("User not found")
          ? "Esse e-mail não está cadastrado neste app. Tente criar uma conta ou usar o mesmo método de login usado antes."
          : rawMessage.includes("Email not confirmed") ? "Confirme seu e-mail antes de entrar."
          : rawMessage.includes("Invalid login credentials") ? "E-mail ou senha incorretos."
          : rawMessage.includes("For security purposes") ? "Não foi possível completar essa ação por segurança. Tente novamente em alguns instantes."
          : messages[rawMessage] || rawMessage || "Não foi possível concluir a operação. Tente novamente.";
      setError(fallbackMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError("Erro ao conectar com Google. Tente novamente.");
  };

  const handleDemo = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "demo@finapp.com",
        password: "$BN+nT!PL!Rua67",
      });
      if (error) throw error;
      onLogin(data.user);
    } catch {
      setError("Erro ao entrar no modo demo.");
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (newMode) => { setMode(newMode); setError(null); setMessage(null); };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-3xl tracking-tight">FinVolt</span>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {mode === "login" && "Bem-vindo de volta"}
            {mode === "register" && "Crie sua conta"}
            {mode === "forgot" && "Recuperar senha"}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          {error && <div className="mb-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>}
          {message && <div className="mb-4 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400">{message}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" required autoComplete="email"
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            {mode !== "forgot" && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Senha</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            )}
            {mode === "login" && (
              <div className="text-right -mt-2">
                <button type="button" onClick={() => changeMode("forgot")} className="text-xs text-indigo-500 hover:text-indigo-700">Esqueci minha senha</button>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Enviar link de recuperação"}
            </button>
          </form>
          {mode !== "forgot" && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-500">ou</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>
              <button onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </button>
            </>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          {mode === "login" && <><span>Não tem conta?{" "}</span><button onClick={() => changeMode("register")} className="text-indigo-500 hover:text-indigo-700 font-medium">Cadastre-se</button></>}
          {mode === "register" && <><span>Já tem conta?{" "}</span><button onClick={() => changeMode("login")} className="text-indigo-500 hover:text-indigo-700 font-medium">Entrar</button></>}
          {mode === "forgot" && <button onClick={() => changeMode("login")} className="text-indigo-500 hover:text-indigo-700 font-medium">Voltar ao login</button>}
        </p>
        <p className="text-center mt-3">
          <button type="button" onClick={handleDemo} disabled={loading}
            className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 underline disabled:opacity-50">
            {loading ? "Aguarde..." : "Continuar como visitante (modo demo)"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get("p") || "dashboard";
  const prevPageRef = useRef(0);
  const [categories, setCategories] = useState([]);
  const [lastDate, setLastDate]     = useState(new Date().toISOString().slice(0, 10));
  const [dark, setDark]             = useState(() => localStorage.getItem("theme") === "dark");
  const [newTx, setNewTx]           = useState(undefined);
  const [moreOpen, setMoreOpen]     = useState(false);
  const [user, setUser]             = useState(undefined);
  const [consented, setConsented]   = useState(() => localStorage.getItem("finvolt_consent") === "true");

  const setPage = (id) => {
    setSearchParams({ p: id });
  };

  const loadCategories = async () => setCategories(await getCategories());
  useEffect(() => { loadCategories(); }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
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
  const handleConsent = () => { localStorage.setItem("finvolt_consent", "true"); setConsented(true); };

  if (!consented) return <ConsentScreen onAccept={handleConsent} />;
  if (user === undefined) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Carregando...</span>
    </div>
  );
  if (!user) return <AuthScreen onLogin={setUser} />;

  const pageContent = (
    <>
      {page === "dashboard"    && <Dashboard onNavigate={setPage} />}
      {page === "transactions" && <Transactions categories={categories} lastDate={lastDate} onDateChange={setLastDate} triggerNew={newTx} />}
      {page === "reports"      && <Reports />}
      {page === "recurrences"  && <Recurrences categories={categories} />}
      {page === "goals"        && <Goals categories={categories} />}
      {page === "categories"   && <Categories categories={categories} onReload={loadCategories} />}
      {page === "profile"      && <Profile user={user} onLogout={() => setUser(null)} />}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors flex flex-col overflow-x-hidden">

      {!isMobile && (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg tracking-tight">FinVolt</span>
            <nav className="flex gap-1 items-center">
              {NAV.map(n => (
                <button key={n.id} onClick={() => setPage(n.id)} title={`Atalho: ${n.key}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    page === n.id ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                  {n.label}
                </button>
              ))}
              {user && (
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); }}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors px-2">
                  Sair
                </button>
              )}
              <button onClick={() => setDark(d => !d)} title="Alternar tema (D)"
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
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base tracking-tight">FinVolt</span>
            <div className="flex items-center gap-1">
              {user && (
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); }}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 px-2">Sair</button>
              )}
              <button onClick={() => setDark(d => !d)}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 text-base">
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main — com swipe no mobile, estático no desktop */}
      {isMobile ? (
        <div className="flex-1 overflow-hidden relative"
          style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
          onTouchStart={e => { prevPageRef.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const diff = prevPageRef.current - e.changedTouches[0].clientX;
            const currentIdx = MOBILE_PRIMARY.indexOf(page);
            if (diff > 50 && currentIdx < MOBILE_PRIMARY.length - 1) {
              goToPage(MOBILE_PRIMARY[currentIdx + 1]);
            } else if (diff < -50 && currentIdx > 0) {
              goToPage(MOBILE_PRIMARY[currentIdx - 1]);
            }
          }}
        >
          <div
            style={{
              display: "flex",
              width: `${MOBILE_PRIMARY.length * 100}%`,
              height: "100%",
              transform: `translateX(-${(MOBILE_PRIMARY.indexOf(page) * 100) / MOBILE_PRIMARY.length}%)`,
              transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "transform",
            }}
          >
            {MOBILE_PRIMARY.map(id => (
              <div
                key={id}
                style={{ width: `${100 / MOBILE_PRIMARY.length}%`, flexShrink: 0 }}
                className="overflow-y-auto px-4 py-6 h-full"
              >
                {id === "dashboard"    && <Dashboard onNavigate={setPage} />}
                {id === "transactions" && <Transactions categories={categories} lastDate={lastDate} onDateChange={setLastDate} triggerNew={newTx} />}
                {id === "reports"      && <Reports />}
                {id === "goals"        && <Goals categories={categories} />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
          {pageContent}
        </main>
      )}

      {/* Menu "Mais" — mobile */}
      {isMobile && moreOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setMoreOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 w-full rounded-t-2xl p-4 pb-8 space-y-1">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3" />
            {MOBILE_MORE.map(id => {
              const n = NAV.find(x => x.id === id);
              return (
                <button key={id} onClick={() => goToPage(id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                    page === id ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                  <span className="text-lg">{n.icon}</span>
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 border-t border-gray-100 dark:border-gray-800 flex justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-40 backdrop-blur">
          {MOBILE_PRIMARY.map(id => {
            const n = NAV.find(x => x.id === id);
            return (
              <button key={id} onClick={() => goToPage(id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
                  page === id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
                <span className="text-lg leading-none">{n.icon}</span>
                {n.label}
              </button>
            );
          })}
          <button onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
              MOBILE_MORE.includes(page) ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
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