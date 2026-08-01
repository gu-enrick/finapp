# FinVolt

> Controle financeiro pessoal — registre suas transações com agilidade.

Aplicação web completa de finanças pessoais com autenticação, multiusuário, relatórios e suporte mobile. Desenvolvida do zero com stack moderna e deploy em produção.

**Demo:** [FinVolt](https://meufinvolt.vercel.app) — clique em "Continuar como visitante" para explorar sem cadastro.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS v4 + Recharts + Framer Motion |
| Backend | Node.js + Express + Zod + Helmet + express-rate-limit |
| Banco | PostgreSQL via Supabase |
| Auth | Supabase Auth (e-mail/senha + Google OAuth) |
| Email | Resend via SMTP |
| Deploy | Vercel (frontend) + Render (backend) |
| Testes | Jest + Supertest — 45 testes automatizados |

---

## Funcionalidades

- **Autenticação** — e-mail/senha, Google OAuth, confirmação de e-mail, recuperação de senha
- **Onboarding** — modal de boas-vindas com tour das funcionalidades e criação automática de categorias padrão no primeiro acesso
- **Transações** — CRUD completo com filtros, busca, ordenação, paginação e atualização otimista
- **Recorrências** — geração de ocorrências previstas com confirmação manual e edição com propagação
- **Relatórios** — métricas mensais, comparativo histórico, projeção de 3 meses e gráficos
- **Metas** — economia, limite por categoria e saldo mínimo com barra de progresso
- **Categorias** — cores personalizadas e soft delete (preserva histórico de transações)
- **Exportação CSV** — com encoding UTF-8 para compatibilidade com Excel
- **Multiusuário** — cada usuário acessa apenas seus próprios dados (JWT + RLS no Supabase)
- **Mobile** — navegação por swipe com translateX (GPU-accelerated), bottom navigation, menu "Mais", cards responsivos
- **Tema escuro/claro** com persistência
- **Atalhos de teclado** — 1-6 navegar, N nova transação, D alternar tema
- **Termos de Uso e Política de Privacidade** — tela de consentimento LGPD no primeiro acesso

---

## Segurança

- Autenticação JWT via Supabase Auth em todas as rotas do backend
- Row Level Security (RLS) no Supabase — isolamento de dados por usuário no banco
- Validação de inputs com Zod em todas as rotas
- Helmet.js para proteção de headers HTTP
- Rate limiting: 500 requisições por IP a cada 15 minutos
- CORS restrito aos domínios autorizados
- HTTPS em todas as conexões (Vercel + Render)

---

## Arquitetura

```
finvolt/
├── backend/
│   ├── server.js       # API REST com requireAuth em todas as rotas
│   ├── database.js     # Conexão PostgreSQL + init das tabelas
│   ├── auth.js         # Middleware JWT via Supabase
│   ├── seed.js         # Dados demo (12 meses, perfil brasileiro)
│   └── __tests__/      # 45 testes Jest + Supertest
└── frontend/
    └── src/
        ├── pages/      # Dashboard, Transactions, Reports, Goals,
        │               # Recurrences, Categories, Profile, Login,
        │               # ConfirmEmail, ResetPassword, Terms, Privacy
        ├── components/ # TransactionModal, RecurrenceModal,
        │               # GenerateModal, ConfirmModal, OnboardingModal
        ├── hooks/      # useIsMobile
        └── lib/        # api.js, supabase.js, createDefaultCategories.js
```

---

## Rodando localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL local
- Conta no Supabase (para autenticação)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Preencha as variáveis no .env
node server.js
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Preencha as variáveis no .env
npm run dev
```

### Variáveis de ambiente

**backend/.env**
```
PORT=3001
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

**frontend/.env**
```
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Seed (dados demo)

```bash
cd backend
node seed.js
```

### Testes

```bash
cd backend
npm test
```

Requer banco `finapp_test` local e `.env.test` configurado.

---

## Roadmap

- [ ] Refatoração modular — `App.jsx` e `server.js` como orquestradores
- [ ] Workspace compartilhado (casal/família)
- [ ] App Android via Capacitor
- [ ] Importação de extrato CSV/OFX
- [ ] Domínio próprio 
- [ ] Plano pago com Stripe 

---

## Licença

MIT com Commons Clause — uso pessoal e educacional livre. Uso comercial não permitido sem autorização.

---

Desenvolvido por [Gustavo Enrick](https://github.com/gu-enrick) · v1.1.0 — Moon