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

## 🤖 Integração e Automação (n8n)

Você pode inserir dados automaticamente no seu banco de dados usando o **n8n** (rodando local ou em servidor). Como o Supabase expõe uma API REST automática, você não precisa de nenhum código extra no painel.

### 1. Inserir Transação Financeira via n8n (Exemplo)
Crie um nó **HTTP Request** no n8n configurado da seguinte forma:

* **Method:** `POST`
* **URL:** `https://rcirkirowyxluskkxyim.supabase.co/rest/v1/transactions`
* **Headers:**
  * `apikey`: `SUA-ANON-PUBLIC-KEY`
  * `Authorization`: `Bearer JWT-DO-SEU-USUARIO` (ou use a `service_role` key **apenas se o n8n for privado**, pois ela ignora o RLS e insere livremente em nome de qualquer ID).
  * `Content-Type`: `application/json`
  * `Prefer`: `return=representation`
* **Body Parameters (JSON):**
  ```json
  {
    "description": "PIX Recebido n8n",
    "value": 150.00,
    "type": "income",
    "category": "Outros",
    "date": "2026-08-11",
    "user_id": "SEU-USER-UUID-DO-SUPABASE-AUTH"
  }
  ```

### 2. Automações úteis para criar:
1. **Extratos Bancários:** Disparar o n8n quando receber e-mails de comprovante bancário (ex: Gmail node) → Filtrar texto com IA (Node Ollama/OpenAI) → Gravar na tabela `transactions`.
2. **Sincronizador de Calendário:** Google Calendar (Buscar eventos do dia) → n8n → Gravar na tabela `agenda_items` (com campo `date` de hoje).

## Licença
Uso pessoal.

