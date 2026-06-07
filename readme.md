# finapp

Aplicação web de finanças pessoais para uso local. Desenvolvida do zero com foco em controle de gastos, entradas, metas e relatórios.

![Stack](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Stack](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Stack](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Stack](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## Funcionalidades

- Registro de transações (gastos e entradas) com categoria, data e descrição
- CRUD completo com busca e filtros por período, tipo e categoria
- Transações recorrentes (semanal, mensal, anual) com geração de ocorrências previstas e confirmação manual
- Relatórios com métricas: saldo, média, mediana, maior categoria, evolução diária
- Comparativo mês a mês com variação percentual
- Projeção dos próximos 3 meses baseada na média histórica
- Metas financeiras: economia mensal, limite por categoria e saldo mínimo
- Exportação de transações em CSV
- Tema escuro/claro com persistência
- Atalhos de teclado para navegação (`1`-`6`, `N`, `D`)
- Categorias customizáveis com cores

## Stack

| Camada   | Tecnologia |
|----------|------------|
| Frontend | React + Vite + Tailwind CSS + Recharts |
| Backend  | Node.js + Express + Zod |
| Banco    | PostgreSQL (local) |

### Decisões técnicas

- **PostgreSQL local** em vez de solução cloud — o app é de uso pessoal, sem necessidade de infraestrutura externa. Em testes de carga com k6, o setup aguentou ~16.000 usuários virtuais simultâneos com 0% de falha.
- **Sem autenticação** — decisão intencional para uso local. O backend escuta apenas em `localhost`, sem exposição externa.
- **Zod para validação** — validação de schema no backend com erros padronizados e descritivos.
- **Transações previstas** — recorrências geram ocorrências com `is_confirmed=false`, separadas visualmente das confirmadas e sem impacto nos relatórios até confirmação manual.

## Pré-requisitos

- [Node.js](https://nodejs.org) v18+
- [PostgreSQL](https://www.postgresql.org) v14+

## Como rodar

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/finapp.git
cd finapp
```

### 2. Configure o backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o `.env` com suas credenciais do PostgreSQL:

```env
PORT=3001
DB_USER=postgres
DB_HOST=localhost
DB_NAME=finapp
DB_PASSWORD=sua_senha
DB_PORT=5432
```

Crie o banco no PostgreSQL:

```bash
psql -U postgres -c "CREATE DATABASE finapp;"
```

Suba o backend (as tabelas são criadas automaticamente):

```bash
node server.js
```

### 3. Configure o frontend

```bash
cd ../frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Estrutura do projeto

```
finapp/
├── backend/
│   ├── server.js        # API REST + rotas
│   ├── database.js      # Conexão e inicialização do banco
│   ├── .env.example     # Variáveis de ambiente necessárias
│   └── package.json
└── frontend/
    └── src/
        ├── pages/       # Dashboard, Transações, Relatórios, Metas, Recorrências, Categorias
        ├── components/  # TransactionModal
        └── lib/
            └── api.js   # Cliente HTTP (axios)
```

## Testes de carga

Realizados com [k6](https://k6.io) comparando SQLite e PostgreSQL:

| Banco      | VUs (sem falha) | Req/s  | p95     |
|------------|-----------------|--------|---------|
| SQLite     | ~800            | 410    | 3.4s    |
| PostgreSQL | ~16.000         | 2.226  | 5.3s    |

PostgreSQL aguentou 20x mais carga com zero falhas no mesmo hardware.