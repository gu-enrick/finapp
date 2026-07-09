import { useState } from "react";
import supabase from "../lib/supabase";

export default function Login({ onLogin }) {
  const [mode, setMode]         = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [message, setMessage]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin(data.user);

      } else if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && !data.user.confirmed_at) {
          setMessage("Confirmação enviada para o seu e-mail. Verifique a caixa de entrada.");
          setMode("login");
        } else {
          onLogin(data.user);
        }

      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage("Link de recuperação enviado. Verifique seu e-mail.");
      }
    } catch (err) {
      const messages = {
        "Invalid login credentials":          "E-mail ou senha incorretos.",
        "Email not confirmed":                 "Confirme seu e-mail antes de entrar.",
        "User already registered":             "Este e-mail já está cadastrado.",
        "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
      };
      setError(messages[err.message] || err.message);
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
    } catch (err) {
      setError("Erro ao entrar no modo demo.");
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-3xl tracking-tight">finapp</span>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {mode === "login"    && "Bem-vindo de volta"}
            {mode === "register" && "Crie sua conta"}
            {mode === "forgot"   && "Recuperar senha"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">E-mail</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="voce@email.com" required autoComplete="email"
                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Senha</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            )}

            {mode === "login" && (
              <div className="text-right -mt-2">
                <button type="button" onClick={() => changeMode("forgot")}
                  className="text-xs text-indigo-500 hover:text-indigo-700">
                  Esqueci minha senha
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? "Aguarde..." :
                mode === "login"    ? "Entrar" :
                mode === "register" ? "Criar conta" :
                "Enviar link de recuperação"}
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

        {/* Alternar modo */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          {mode === "login" && (
            <>Não tem conta?{" "}
              <button onClick={() => changeMode("register")}
                className="text-indigo-500 hover:text-indigo-700 font-medium">Cadastre-se</button>
            </>
          )}
          {mode === "register" && (
            <>Já tem conta?{" "}
              <button onClick={() => changeMode("login")}
                className="text-indigo-500 hover:text-indigo-700 font-medium">Entrar</button>
            </>
          )}
          {mode === "forgot" && (
            <button onClick={() => changeMode("login")}
              className="text-indigo-500 hover:text-indigo-700 font-medium">Voltar ao login</button>
          )}
        </p>

        {/* Demo */}
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