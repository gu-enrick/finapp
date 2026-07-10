export default function ConsentScreen({ onAccept }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-3xl tracking-tight">FinVolt</span>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Antes de continuar</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Olá! Antes de usar o FinVolt, pedimos que leia e concorde com nossos documentos legais. Eles explicam como seus dados são tratados e quais são seus direitos.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
            <a href="/termos" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
              <span>📄 Termos de Uso</span>
              <span className="text-xs">Abrir →</span>
            </a>
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <a href="/privacidade" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
              <span>🔒 Política de Privacidade</span>
              <span className="text-xs">Abrir →</span>
            </a>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            Ao continuar, você confirma que leu e concorda com os documentos acima, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
          </p>

          <button onClick={onAccept}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Li e concordo — Continuar
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Se não concordar, não utilize o serviço.
          </p>
        </div>
      </div>
    </div>
  );
}