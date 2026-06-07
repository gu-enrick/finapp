import { useState, useEffect } from "react";
import { getReport } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from "recharts";

const fmt = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

const PERIODS = [
  { label: "Hoje",         getValue: () => { const d = today(); return { start: d, end: d }; } },
  { label: "Este mês",     getValue: () => { const n = new Date(); return { start: `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-01`, end: today() }; } },
  { label: "Este ano",     getValue: () => ({ start: `${new Date().getFullYear()}-01-01`, end: today() }) },
  { label: "Personalizado",getValue: () => null },
];

function today() { return new Date().toISOString().slice(0, 10); }

function monthRange(offset) {
  const n = new Date();
  n.setMonth(n.getMonth() + offset);
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const last = new Date(y, n.getMonth() + 1, 0).getDate();
  return {
    start: `${y}-${m}-01`,
    end:   `${y}-${m}-${last}`,
    label: n.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  };
}

function StatCard({ label, value, sub, color = "text-gray-800 dark:text-gray-100" }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Projection() {
  const [months, setMonths] = useState([]);
  const [monthlyComparison, setMonthlyComparison] = useState([]);

  useEffect(() => {
    const load = async () => {
      const results = [];
      for (let i = -5; i <= 0; i++) {
        const r = monthRange(i);
        const data = await getReport(r);
        results.push({ ...data, label: new Date(r.start + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), month: r.start.slice(0, 7) });
      }
      setMonths(results);
      setMonthlyComparison(results.map(m => ({ label: m.label, Entradas: m.total_income, Gastos: m.total_expense })));
    };
    load();
  }, []);

  if (months.length < 2) return null;
  const confirmed = months.filter(m => m.count > 0);
  if (confirmed.length === 0) return null;

  const avgIncome  = confirmed.reduce((s, m) => s + m.total_income,  0) / confirmed.length;
  const avgExpense = confirmed.reduce((s, m) => s + m.total_expense, 0) / confirmed.length;
  const avgBalance = avgIncome - avgExpense;

  const next3 = [1, 2, 3].map(i => {
    const r = monthRange(i);
    return { label: new Date(r.start + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), Entradas: avgIncome, Gastos: avgExpense };
  });

  const chartData = [...monthlyComparison.slice(-3), ...next3];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200">Projeção dos próximos 3 meses</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">média dos últimos {confirmed.length} meses</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Entradas previstas/mês</p>
            <p className="text-base font-semibold text-green-600">{fmt(avgIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gastos previstos/mês</p>
            <p className="text-base font-semibold text-red-500">{fmt(avgExpense)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Saldo projetado/mês</p>
            <p className={`text-base font-semibold ${avgBalance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-red-500"}`}>{fmt(avgBalance)}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v}`} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="Entradas" fill="#22c55e" radius={[4,4,0,0]} opacity={0.85} />
            <Bar dataKey="Gastos"   fill="#ef4444" radius={[4,4,0,0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">Barras à direita são projeções baseadas na média histórica</p>
      </div>

      {monthlyComparison.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Entradas vs Gastos por mês</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v}`} />
              <Tooltip formatter={v => fmt(v)} />
              <Legend />
              <Bar dataKey="Entradas" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="Gastos"   fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const [offset, setOffset]   = useState(0);
  const [period, setPeriod]   = useState(null); // null = segue carrossel
  const [custom, setCustom]   = useState({ start: "", end: "" });
  const [carouselData, setCarouselData] = useState(null);
  const [prevData, setPrevData]         = useState(null);
  const [data, setData]                 = useState(null);

  // Range do carrossel
  const carouselRange = monthRange(offset);

  // Range efetivo dos gráficos: período manual ou carrossel
  const effectiveRange = (() => {
    if (period === null) return carouselRange;
    if (period === 3)    return custom.start ? custom : null;
    return PERIODS[period].getValue();
  })();

  // Carrossel
  useEffect(() => {
    const r     = monthRange(offset);
    const rPrev = monthRange(offset - 1);
    Promise.all([getReport(r), getReport(rPrev)]).then(([c, p]) => {
      setCarouselData({ ...c, ...r });
      setPrevData(p);
    });
  }, [offset]);

  // Gráficos
  useEffect(() => {
    if (!effectiveRange?.start) return;
    getReport(effectiveRange).then(setData);
  }, [offset, period, custom]);

  const expenseByCategory = data?.byCategory?.filter(c => c.type === "expense" && parseFloat(c.total) > 0) || [];
  const incomeByCategory  = data?.byCategory?.filter(c => c.type === "income") || [];

  const dailyData = (() => {
    if (!data?.daily?.length || !effectiveRange?.start || !effectiveRange?.end) return [];
    const map = {};
    data.daily.forEach(d => { map[d.date] = { income: d.income, expense: d.expense }; });
    const result = [];
    const cur = new Date(effectiveRange.start + "T00:00:00");
    const end = new Date(effectiveRange.end   + "T00:00:00");
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      result.push({
        date:     new Date(key + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        Entradas: map[key]?.income  || 0,
        Gastos:   map[key]?.expense || 0,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  })();

  const incomeDiff  = (prevData?.total_income  > 0 && carouselData) ? ((carouselData.total_income  - prevData.total_income)  / prevData.total_income)  * 100 : null;
  const expenseDiff = (prevData?.total_expense > 0 && carouselData) ? ((carouselData.total_expense - prevData.total_expense) / prevData.total_expense) * 100 : null;
  const balanceDiff = (prevData?.balance !== 0 && carouselData)     ? ((carouselData.balance       - prevData.balance)       / Math.abs(prevData.balance)) * 100 : null;
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Relatórios</h1>

      {/* Carrossel — controla os gráficos por padrão */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setOffset(o => o - 1); setPeriod(null); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors text-lg leading-none">‹</button>
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">{carouselRange.label}</h2>
          <button onClick={() => { setOffset(o => o + 1); setPeriod(null); }} disabled={offset >= 0}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors text-lg leading-none disabled:opacity-30">›</button>
        </div>

        {carouselData && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Entradas</p>
                <p className="text-lg font-semibold text-green-600">{fmt(carouselData.total_income)}</p>
                {incomeDiff !== null && <p className={`text-xs mt-0.5 ${incomeDiff >= 0 ? "text-green-500" : "text-red-400"}`}>{fmtPct(incomeDiff)} vs anterior</p>}
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gastos</p>
                <p className="text-lg font-semibold text-red-500">{fmt(carouselData.total_expense)}</p>
                {expenseDiff !== null && <p className={`text-xs mt-0.5 ${expenseDiff <= 0 ? "text-green-500" : "text-red-400"}`}>{fmtPct(expenseDiff)} vs anterior</p>}
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo</p>
                <p className={`text-lg font-semibold ${carouselData.balance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-red-500"}`}>{fmt(carouselData.balance)}</p>
                {balanceDiff !== null && <p className={`text-xs mt-0.5 ${balanceDiff >= 0 ? "text-green-500" : "text-red-400"}`}>{fmtPct(balanceDiff)} vs anterior</p>}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>{carouselData.count} transações confirmadas</span>
              <span>Média: {fmt(carouselData.average)}</span>
            </div>
          </>
        )}
      </div>

      {/* Filtros de período — sobrepõem o carrossel */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 dark:text-gray-500">Detalhar por:</span>
        {PERIODS.map((p, i) => (
          <button key={i} onClick={() => setPeriod(period === i ? null : i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === i ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
            {p.label}
          </button>
        ))}
        {period !== null && (
          <button onClick={() => setPeriod(null)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline">
            Voltar ao mês do carrossel
          </button>
        )}
      </div>

      {period === 3 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 flex gap-3 flex-wrap shadow-sm border border-gray-100 dark:border-gray-800">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">De</label>
            <input type="date" value={custom.start} onChange={e => setCustom(c => ({ ...c, start: e.target.value }))}
              className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Até</label>
            <input type="date" value={custom.end} onChange={e => setCustom(c => ({ ...c, end: e.target.value }))}
              className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
      )}

      {!data ? (
        <div className="text-center text-gray-400 py-12 text-sm">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Saldo" value={fmt(data.balance)} color={data.balance >= 0 ? "text-green-600" : "text-red-500"} />
            <StatCard label="Total de entradas" value={fmt(data.total_income)} color="text-green-600" />
            <StatCard label="Total de gastos" value={fmt(data.total_expense)} color="text-red-500" />
            <StatCard label="Transações" value={data.count} sub="no período" />
            <StatCard label="Média por transação" value={fmt(data.average)} />
            <StatCard label="Mediana" value={fmt(data.median)} />
            <StatCard label="Maior categoria de gasto" value={expenseByCategory[0]?.name || "—"} sub={expenseByCategory[0] ? fmt(expenseByCategory[0].total) : ""} />
            <StatCard label="Maior fonte de entrada" value={incomeByCategory[0]?.name || "—"} sub={incomeByCategory[0] ? fmt(incomeByCategory[0].total) : ""} />
          </div>

          {dailyData.length > 1 && dailyData.length <= 60 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Movimentação diária</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(dailyData.length / 10)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v}`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Entradas" fill="#22c55e" radius={[2,2,0,0]} />
                  <Bar dataKey="Gastos"   fill="#ef4444" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {expenseByCategory.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Gastos por categoria</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={expenseByCategory} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Bar dataKey="total" radius={[0,4,4,0]}>
                      {expenseByCategory.map((c, i) => <Cell key={i} fill={c.color || `hsl(${i*40},70%,55%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <Projection />

          {data.count === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Nenhuma transação no período selecionado</div>
          )}
        </>
      )}
    </div>
  );
}