import { useState, useEffect } from "react";
import { getReport, getTransactions } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import PageSkeleton from "../components/PageSkeleton";

const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const getLocalDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const today = () => getLocalDate(new Date());
const monthStart = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
};

function StatCard({ label, value, color = "text-gray-800 dark:text-gray-100", sub }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [report, setReport]   = useState(null);
  const [recent, setRecent]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rep, txs] = await Promise.all([
          getReport({ start: monthStart(), end: today() }),
          getTransactions({ start: monthStart(), end: today(), limit: 50 }),
        ]);
        setReport(rep);
        setRecent((txs.data || txs).filter(t => t.is_confirmed).slice(0, 5));
      } catch {
        setError("Não foi possível carregar os dados. O backend pode estar iniciando — tente novamente em alguns segundos.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <PageSkeleton rows={4} />
    </div>
  );
  if (error) return (
  <div className="flex flex-col items-center justify-center py-24 gap-3">
    <p className="text-red-500 text-sm text-center max-w-sm">{error}</p>
    <button onClick={() => { setError(null); setLoading(true); }}
      className="text-xs text-indigo-500 hover:text-indigo-700 underline">
      Tentar novamente
    </button>
  </div>
);


  const expenseByCategory = (report?.byCategory || []).filter(c => c.type === "expense" && c.total > 0);
  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Dashboard</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">{monthName}</p>
        </div>
        <button onClick={() => onNavigate("transactions")}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Nova transação
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Saldo do mês" value={fmt(report?.balance)}
          color={report?.balance >= 0 ? "text-green-600" : "text-red-500"} />
        <StatCard label="Entradas" value={fmt(report?.total_income)} color="text-green-600" />
        <StatCard label="Gastos" value={fmt(report?.total_expense)} color="text-red-500" />
        <StatCard label="Transações" value={report?.count || 0} sub="este mês" />
      </div>

      {(report?.projected_expense > 0 || report?.projected_income > 0) && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">Previstas este mês</p>
          <div className="flex gap-4 flex-wrap">
            {report.projected_expense > 0 && (
              <span className="text-sm text-red-500 font-medium">Gastos: {fmt(report.projected_expense)}</span>
            )}
            {report.projected_income > 0 && (
              <span className="text-sm text-green-600 font-medium">Entradas: {fmt(report.projected_income)}</span>
            )}
          </div>
          <button onClick={() => onNavigate("transactions")}
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 mt-2 underline">
            Ver e confirmar →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {expenseByCategory.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Gastos por categoria</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={expenseByCategory} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }}
                  tickFormatter={v => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {expenseByCategory.map((c, i) => <Cell key={i} fill={c.color || "#6366f1"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Últimas transações</h2>
            <button onClick={() => onNavigate("transactions")}
              className="text-xs text-indigo-500 hover:text-indigo-700">Ver todas →</button>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Nenhuma transação este mês</p>
          ) : (
            <div className="space-y-2">
              {recent.map(t => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{t.description || t.category_name || "—"}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(t.date).toLocaleDateString("pt-BR")}
                      {t.category_name && ` · ${t.category_name}`}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${t.type === "income" ? "text-green-600" : "text-red-500"}`}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}