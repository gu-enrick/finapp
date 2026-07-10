export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="text-center">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-2xl tracking-tight">FinVolt</span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Política de Privacidade</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">Última atualização: julho de 2026</p>

          {[
            { title: "1. Quais dados coletamos", text: "Coletamos e-mail, nome e as transações que você registra manualmente. Também coletamos métricas anônimas de uso e logs de acesso para segurança. Não coletamos senhas, dados bancários reais ou localização." },
            { title: "2. Como usamos seus dados", text: "Seus dados são usados para fornecer o serviço, enviar e-mails transacionais (confirmação de cadastro, recuperação de senha) e melhorar o produto. Não vendemos seus dados e não usamos publicidade." },
            { title: "3. Com quem compartilhamos", text: "Seus dados são processados por: Supabase (banco de dados e autenticação), Vercel (hospedagem do frontend), Render (hospedagem do backend) e Resend (e-mails transacionais). Todos operam em conformidade com a LGPD." },
            { title: "4. Seus direitos (LGPD)", text: "Você tem direito a acessar, corrigir e excluir seus dados. Para exportar, use a função CSV no app. Para excluir sua conta e dados, entre em contato pelo e-mail de suporte — removeremos tudo em até 30 dias." },
            { title: "5. Segurança", text: "Toda comunicação é criptografada via HTTPS. Senhas nunca são armazenadas em texto puro. O banco de dados usa Row Level Security — cada usuário acessa apenas seus próprios dados." },
            { title: "6. Cookies", text: "O FinVolt usa localStorage do navegador para manter sua sessão e preferências. Não usamos cookies de rastreamento ou publicidade." },
            { title: "7. Contato", text: "Para exercer seus direitos ou tirar dúvidas: gustavo.enrick20@gmail.com. Prazo de resposta: até 15 dias úteis." },
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
