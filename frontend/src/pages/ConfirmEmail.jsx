import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabase";

export default function ConfirmEmail() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setStatus("success");
        setTimeout(() => navigate("/"), 3000);
      } else if (event === "TOKEN_REFRESHED") {
        setStatus("success");
        setTimeout(() => navigate("/"), 3000);
      }
    });

    // Verifica se já tem sessão ativa (confirmação já processada)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("success");
        setTimeout(() => navigate("/"), 3000);
      } else {
        setTimeout(() => setStatus("error"), 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-3xl tracking-tight block mb-8">finapp</span>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          {status === "loading" && (
            <>
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Confirmando seu e-mail...</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">E-mail confirmado!</h2>
              <p className="text-sm text-gray-400 dark:text-gray-500">Redirecionando para o app...</p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="text-4xl mb-4">❌</div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Link inválido ou expirado</h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Tente fazer login ou solicite um novo link.</p>
              <button onClick={() => navigate("/")}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Ir para o login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}