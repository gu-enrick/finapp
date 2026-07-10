# FinVolt

> Controle financeiro pessoal — registre suas transações com agilidade.

Aplicação web completa de finanças pessoais com autenticação, multiusuário, relatórios e modo mobile. Desenvolvida do zero com stack moderna e deploy em produção.

**Demo:** [FinVolt](https://meufinvolt.vercel.app) — clique em "Continuar como visitante" para explorar sem cadastro.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + Tailwind CSS + Recharts |
| Backend | Node.js + Express + Zod + Helmet |
| Banco | PostgreSQL via Supabase |
| Auth | Supabase Auth (e-mail/senha + Google OAuth) |
| Email | Resend via SMTP |
| Deploy | Vercel (frontend) + Render (backend) |
| Testes | Jest + Supertest (46 testes) |

---

## Funcionalidades

- **Transações** — CRUD completo com filtros, busca, ordenação e paginação
- **Recorrências** — geração de ocorrências previstas com confirmação manual e edição com propagação
- **Relatórios** — métricas mensais, comparativo histórico, projeção de 3 meses e gráficos
- **Metas** — economia, limite por categoria e saldo mínimo com barra de progresso
- **Categorias** — cores personalizadas e soft delete (preserva histórico)
- **Exportação CSV** — com encoding UTF-8 para compatibilidade com Excel
- **Autenticação** — e-mail/senha, Google OAuth, confirmação de e-mail e recuperação de senha
- **Multiusuário** — cada usuário acessa apenas seus próprios dados (RLS + user_id)
- **Mobile** — bottom navigation, menu "Mais", cards de transação, totalmente responsivo
- **Tema escuro/claro** com persistência
- **Atalhos de teclado** — 1-6 navegar, N nova transação, D alternar tema

---

## Arquitetura

```
finapp/
├── backend/
│   ├── server.js       # API REST com requireAuth em todas as rotas
│   ├── database.js     # Conexão PostgreSQL + init das tabelas
│   ├── auth.js         # Middleware JWT via Supabase
│   ├── seed.js         # Dados demo (12 meses, perfil brasileiro)
│   └── __tests__/      # 46 testes Jest + Supertest
└── frontend/
    └── src/
        ├── pages/      # Dashboard, Transactions, Reports, Goals,
        │               # Recurrences, Categories, Profile, Login,
        │               # ConfirmEmail, ResetPassword, Terms, Privacy
        ├── components/ # TransactionModal, RecurrenceModal,
        │               # GenerateModal, ConfirmModal
        ├── hooks/      # useIsMobile
        └── lib/        # api.js (axios + JWT), supabase.js
```

---

## Rodando localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL local ou conta no Supabase
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

## Segurança

- Autenticação JWT via Supabase Auth em todas as rotas
- Row Level Security (RLS) no banco — cada usuário acessa apenas seus dados
- Validação de inputs com Zod no backend
- Helmet.js para proteção de headers HTTP
- Rate limiting: 500 requisições por IP a cada 15 minutos
- HTTPS em todas as conexões (Vercel + Render)

---

## Roadmap

- [ ] Google OAuth (configurado, aguardando propagação do nome no Google Cloud)
- [ ] Workspace compartilhado (casal/família)
- [ ] App Android via Capacitor
- [ ] Importação de extrato CSV/OFX
- [ ] Plano pago com Stripe

---

## Licença

MIT com Commons Clause — uso pessoal e educacional livre. Uso comercial não permitido sem autorização.

---

Desenvolvido por [Gustavo Enrick](https://github.com/gu-enrick)