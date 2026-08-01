import { useState } from "react";

const STEPS = [
  {
    icon: "⚡",
    title: "Bem-vindo ao FinVolt!",
    description:
      "Seu controle financeiro pessoal, simples e rápido. Veja o que você pode fazer:",
  },
  {
    icon: "🏠",
    title: "Dashboard",
    description:
      "Visão geral do mês — entradas, gastos, saldo e suas últimas transações em um só lugar.",
  },
  {
    icon: "💳",
    title: "Transações",
    description:
      "Registre entradas e gastos manualmente. Filtre por data, categoria ou tipo. Exporte pra CSV quando quiser.",
  },
  {
    icon: "📊",
    title: "Relatórios",
    description:
      "Acompanhe sua evolução mês a mês, veja onde gasta mais e projete os próximos 3 meses.",
  },
  {
    icon: "🎯",
    title: "Metas",
    description:
      "Defina uma reserva mensal, um limite de gasto por categoria ou um saldo mínimo. O app te avisa quando estiver perto do limite.",
  },
  {
    icon: "🔁",
    title: "Recorrências",
    description:
      "Cadastre contas fixas como aluguel, streaming e internet. Gere as ocorrências do mês e confirme quando pagar.",
  },
  {
    icon: "🏷️",
    title: "Categorias",
    description:
      "Já criamos algumas categorias pra você começar. Personalize as cores, adicione novas ou desative as que não usa.",
  },
  {
    icon: "✅",
    title: "Tudo pronto!",
    description:
      "Comece registrando sua primeira transação. Quanto mais você registrar, mais preciso fica o seu controle.",
  },
];

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-100 dark:border-gray-800">
        {/* Ícone */}
        <div className="text-5xl text-center mb-4">{current.icon}</div>

        {/* Título e descrição */}
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 text-center mb-2">
          {current.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-6">
          {current.description}
        </p>

        {/* Indicadores de progresso */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-indigo-600"
                  : i < step
                    ? "w-1.5 bg-indigo-300 dark:bg-indigo-700"
                    : "w-1.5 bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          {!isFirst && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Voltar
            </button>
          )}
          {isFirst && (
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Pular
            </button>
          )}
          <button
            onClick={isLast ? onClose : () => setStep((s) => s + 1)}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {isLast ? "Começar!" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
