export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="text-center">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-2xl tracking-tight">FinVolt</span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Termos de Uso</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">Última atualização: julho de 2026</p>

          {[
            { title: "1. O que é o FinVolt", text: "O FinVolt é um aplicativo de controle financeiro pessoal. Ele permite registrar manualmente entradas, gastos, metas e recorrências. O FinVolt não é uma instituição financeira, não movimenta dinheiro real e não acessa contas bancárias." },
            { title: "2. Uso permitido", text: "Você pode usar o FinVolt para registrar e acompanhar suas finanças pessoais e exportar seus dados. É proibido usar o serviço para fins ilegais, tentar acessar dados de outros usuários ou sobrecarregar os servidores." },
            { title: "3. Conta e responsabilidade", text: "Você é responsável por manter sua senha segura. O FinVolt não tem acesso à sua senha — ela é gerenciada com criptografia. Em caso de uso não autorizado, notifique pelo e-mail de suporte." },
            { title: "4. Disponibilidade", text: "O FinVolt é oferecido sem garantia de disponibilidade ininterrupta. Em caso de encerramento do serviço, você receberá aviso prévio de 30 dias e poderá exportar seus dados." },
            { title: "5. Limitação de responsabilidade", text: "O FinVolt não se responsabiliza por decisões financeiras tomadas com base nos dados inseridos. As informações exibidas refletem apenas o que o usuário registrou manualmente." },
            { title: "6. Alterações", text: "Podemos atualizar estes termos. Alterações significativas serão comunicadas por e-mail com pelo menos 15 dias de antecedência." },
          ].map(({ title, text }) => (
            <div key={title}>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-8">
          FinVolt · Controle financeiro pessoal
        </p>
      </div>
    </div>
  );
}