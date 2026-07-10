import { useState } from "react";
import supabase from "../lib/supabase";
import toast from "react-hot-toast";
import { normalizeText, VALIDATION_MESSAGES } from "../lib/validation";

export default function Profile({ user, onLogout }) {
  const [name, setName]           = useState(user?.user_metadata?.full_name || "");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loadingName, setLoadingName]   = useState(false);
  const [loadingPass, setLoadingPass]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    const cleanedName = normalizeText(name);
    if (!cleanedName) return toast.error(VALIDATION_MESSAGES.invalidName);
    setLoadingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: cleanedName } });
      if (error) throw error;
      setName(cleanedName);
      toast.success("Nome atualizado");
    } catch (err) {
      toast.error(err.message || "Erro ao atualizar nome");
    } finally {
      setLoadingName(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const cleanedPassword = normalizeText(password);
    const cleanedConfirm = normalizeText(confirm);
    if (cleanedPassword.length < 6) return toast.error(VALIDATION_MESSAGES.invalidPassword);
    if (cleanedPassword !== cleanedConfirm) return toast.error(VALIDATION_MESSAGES.passwordMismatch);
    setLoadingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: cleanedPassword });
      if (error) throw error;
      toast.success("Senha atualizada");
      setPassword("");
      setConfirm("");
    } catch (err) {
      toast.error(err.message || "Erro ao atualizar senha");
    } finally {
      setLoadingPass(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const isGoogle = user?.app_metadata?.provider === "google";
  const isDemo = user?.email === "demo@finapp.com";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const email = user?.email || "";
  const initials = (name || email).slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Perfil</h1>

      {/* Avatar + info */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar"
            className="w-14 h-14 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            {name || "Sem nome"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{email}</p>
          {isGoogle && isDemo && (
            <span className="inline-flex items-center gap-1 text-[10px] mt-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              <svg width="10" height="10" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.2２ 1 1２s．4３ ３．４５ １．１８ ４．９３l２．８５－２．２２．８１－．６２z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </span>
          )}
        </div>
      </div>

      {/* Nome */}
      {!isDemo && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Nome de exibição</h2>
          <form onSubmit={handleUpdateName} className="flex gap-2">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <button type="submit" disabled={loadingName}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 shrink-0">
              {loadingName ? "..." : "Salvar"}
            </button>
          </form>
        </div>
      )}

      {/* Senha — só pra quem não usa Google e não é demo */}
      {!isGoogle && !isDemo && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Alterar senha</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Nova senha</label>
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6}
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Confirmar senha</label>
              <input type={showPassword ? "text" : "password"} value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
              <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)}
                className="accent-indigo-600" />
              Mostrar senha
            </label>
            <button type="submit" disabled={loadingPass}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loadingPass ? "Salvando..." : "Alterar senha"}
            </button>
          </form>
        </div>
      )}

      {/* Sair */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Sessão</h2>
        {isDemo && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400 text-center mb-3">
            Você está no modo visitante. Crie uma conta para salvar seus dados.
          </div>
        )}
        <button onClick={handleLogout}
          className="w-full border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 py-2 rounded-lg text-sm font-medium transition-colors">
          Sair da conta
        </button>
      </div>
    </div>
  );
}