import { useState } from "react";

export default function GenerateModal({ open, onClose, onGenerate, recurrence }) {
  const [count, setCount]           = useState(12);
  const [untilEndOfYear, setUntilEndOfYear] = useState(false);

  if (!open) return null;

  const handleSubmit = () => {
    if (untilEndOfYear) {
      onGenerate({ until_end_of_year: true });
    } else {
      if (!count || count < 1) return;
      onGenerate({ count: parseInt(count) });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-1 text-gray-800 dark:text-gray-100">Gerar ocorrências</h2>
        {recurrence && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {recurrence.description || "Sem descrição"} · {recurrence.frequency === "weekly" ? "Semanal" : recurrence.frequency === "monthly" ? "Mensal" : "Anual"}
          </p>
        )}

        <div className="space-y-4">
          {/* Quantidade */}
          <div className={untilEndOfYear ? "opacity-40 pointer-events-none" : ""}>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
              Quantidade de ocorrências
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="1" max="120" value={count}
                onChange={e => setCount(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-24" />
              <div className="flex gap-1.5">
                {[3, 6, 12, 24].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                      count === n && !untilEndOfYear
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}>
                    {n}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            <span className="text-xs text-gray-400 dark:text-gray-500">ou</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>

          {/* Até fim do ano */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={untilEndOfYear}
              onChange={e => setUntilEndOfYear(e.target.checked)}
              className="accent-indigo-600" />
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-200">Até fim do ano</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Gera todas as ocorrências até 31/12/{new Date().getFullYear()}
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancelar
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Gerar
          </button>
        </div>
      </div>
    </div>
  );
}