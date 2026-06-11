# finapp

Aplicação web de finanças pessoais para uso local ou em produção. Desenvolvida do zero com foco em controle de gastos, entradas, metas e relatórios.

**Demo ao vivo:** [FinApp.](https://finapp-mb9tmn603-gustavo-enrick-s-projects.vercel.app/)

> ⚠️ A versão de demonstração roda em modo somente leitura — alterações não são salvas. Para uso pessoal com persistência real, clone e rode localmente.

> 💻 Melhor visualizado em desktop. Suporte mobile ainda não implementado.

![Stack](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Stack](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Stack](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Stack](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## Funcionalidades

- Registro de transações (gastos e entradas) com categoria, data e descrição
- CRUD completo com busca e filtros por período, tipo e categoria
- Transações recorrentes (semanal, mensal, anual) com geração de ocorrências previstas e confirmação manual
- Relatórios com métricas: saldo, média, mediana, maior categoria, evolução por período
- Comparativo mês a mês com variação percentual navegável via carrossel
- Projeção dos próximos 3 meses baseada na média histórica
- Metas financeiras: economia mensal, limite por categoria e saldo mínimo com barra de progresso
- Exportação de transações em CSV
- Tema escuro/claro com persistência via localStorage
- Atalhos de teclado: `1`–`6` para navegação, `N` nova transação, `D` alternar tema
- Categorias customizáveis com cores

## Stack

| Camada   | Tecnologia |
|----------|------------|
| Frontend | React + Vite + Tailwind CSS + Recharts |
| Backend  | Node.js + Express + Zod |
| Banco    | PostgreSQL (local) ou Neon (produção) |
| Deploy   | Vercel (frontend) + Render (backend) |

### Decisões técnicas

**PostgreSQL em vez de SQLite**
SQLite foi usado inicialmente pelo zero de configuração. A migração para PostgreSQL foi motivada por testes de carga que evidenciaram limitação crítica de concorrência no SQLite: sob carga simultânea, ele serializa todas as operações de escrita, causando fila e degradação de resposta. O PostgreSQL, com suporte nativo a concorrência e connection pooling, sustentou carga 20x maior com zero falhas nos mesmos testes.

**Sem autenticação na versão local**
Decisão intencional para uso pessoal local. O backend escuta apenas em `localhost`, sem exposição externa. A análise de risco considerou que os dados (finanças pessoais) têm baixa sensibilidade e o contexto é de uso único em rede privada — adicionar autenticação seria overengineering sem benefício real.

**Zod para validação**
Validação de schema no backend com erros padronizados e descritivos. Previne inserção de dados malformados e centraliza as regras de negócio antes de qualquer operação no banco.

**Transações previstas**
Recorrências geram ocorrências com `is_confirmed = false`, separadas visualmente das confirmadas e excluídas dos cálculos de relatório até confirmação manual. Permite planejamento sem distorcer o histórico real.

**Modo demo em produção**
Middleware no backend intercepta todas as requisições de escrita (POST, PUT, PATCH, DELETE) e retorna `{ ok: true }` sem persistir nada. O banco de demonstração contém 12 meses de dados fictícios com variância realista baseada no perfil de um trabalhador CLT brasileiro.

## Testes de carga

Realizados com [k6](https://k6.io) em hardware local (AMD Ryzen 5 3500U, 12GB RAM) comparando SQLite e PostgreSQL sob carga crescente de 100 até 6.400 usuários virtuais simultâneos.

| Banco      | VUs sem falha | Throughput  | Latência p95 | Taxa de falha em 20k VUs |
|------------|---------------|-------------|--------------|--------------------------|
| SQLite     | ~800          | 410 req/s   | 3,4s         | ~36%                     |
| PostgreSQL | ~16.000       | 2.226 req/s | 5,3s         | 0%                        |

O gargalo do SQLite é estrutural: por ser single-writer, todas as requisições de escrita são serializadas em fila. O PostgreSQL usa um modelo de processos independentes por conexão (process-per-connection), permitindo paralelismo real. O limite de ~16.000 VUs no PostgreSQL foi determinado pelo esgotamento do connection pool (padrão de 10 conexões) — ajustável via `max` no Pool ou uso de um connection pooler externo como PgBouncer.

Testes adicionais com Node.js em modo cluster (8 workers, um por thread lógica do processador) mostraram regressão de performance em vez de ganho: cada worker abre seu próprio pool, multiplicando as conexões simultâneas no PostgreSQL além do suportado. A solução correta em produção de alta escala é um pooler centralizado, não cluster sem coordenação de conexões.

## Pré-requisitos

- [Node.js](https://nodejs.org) v18+
- [PostgreSQL](https://www.postgresql.org) v14+

## Como rodar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/gu-enrick/finapp.git
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

Crie o banco:

```bash
psql -U postgres -c "CREATE DATABASE finapp;"
```

Suba o backend — as tabelas são criadas automaticamente:

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
│   ├── server.js        # API REST + rotas + validação
│   ├── database.js      # Conexão e inicialização do banco
│   ├── demo.js          # Middleware modo demo (bloqueia escrita)
│   ├── .env.example     # Variáveis de ambiente necessárias
│   └── package.json
└── frontend/
    └── src/
        ├── pages/       # Dashboard, Transações, Relatórios, Metas, Recorrências, Categorias
        ├── components/  # TransactionModal
        └── lib/
            └── api.js   # Cliente HTTP (axios)
```

## Deploy em produção

O projeto está configurado para deploy gratuito com:

- **Frontend:** [Vercel](https://vercel.com) — conecta ao repositório GitHub, build automático
- **Backend:** [Render](https://render.com) — Web Service com Node.js, free tier
- **Banco:** [Neon](https://neon.tech) — PostgreSQL serverless, free tier

> **⚠️ Licenciamento e Uso**
> Este projeto tem seu código aberto para fins de estudo, portfólio e uso pessoal. Ele utiliza a licença MIT com a **Commons Clause**. É estritamente proibido criar cópias comerciais, clones substancialmente idênticos ou revender este software como serviço. Se inspire à vontade, mas construa o seu próprio produto.