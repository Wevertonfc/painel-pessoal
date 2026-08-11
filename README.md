# 🎯 Painel Pessoal

Hub pessoal de organização com 4 módulos:

- **💰 Financeiro** — Controle de receitas/despesas com filtros e resumo
- **📋 Briefing** — Agenda do dia + pendências com prioridade
- **💡 Ideias** — Registro de ideias com tags e filtros
- **📍 Checkpoint** — Diário com registro de humor

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML/JS/CSS estático |
| Hospedagem | GitHub Pages |
| Banco de dados | Supabase (Postgres) |
| Autenticação | Supabase Auth (email + senha) |

## Setup

### 1. Supabase
1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o conteúdo de `supabase-setup.sql`
3. Vá em **Authentication > Settings** e desabilite "Allow new users to sign up"
4. Crie seu usuário em **Authentication > Users > Add user**
5. Copie a `SUPABASE_URL` e `anon public key` (em **Settings > API**)

### 2. Configurar o App
Abra `assets/app.js` e substitua:
```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-ANON-KEY-AQUI';
```

### 3. Deploy
O app está publicado automaticamente via GitHub Pages em:
`https://wevertonfc.github.io/painel-pessoal/`

## Segurança
- A `anon public key` é **pública por design** — a segurança real vem do RLS
- Row Level Security (RLS) ativo em todas as tabelas
- Cada query exige `auth.uid() = user_id`
- Signup público desabilitado
- A `service_role key` **nunca** deve aparecer no código

## Licença
Uso pessoal.
