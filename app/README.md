# Do Medo ao Play — Assistente de IA

Assistente de IA para alunos do curso **Do Medo ao Play** (Vitória Caroline). Chat multimodal disponível a qualquer hora: manda uma foto do setup de gravação e recebe orientação de áudio, luz, altura e apoio de câmera; ajuda a escolher tema e palavras-chave; revisa roteiro antes de gravar; dá feedback de voz e dicção; tira dúvidas de técnica.

Vive na pasta `app/` deste mesmo repositório, mas é um projeto independente do site de vendas (`index.html` e afins, na raiz): build separado (Vite/React aqui dentro, site estático na raiz), sem nenhuma dependência entre os dois. Quem visita a landing page não carrega nada deste app. Este é o produto que o aluno usa depois de entrar no curso.

## Stack

- **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **IA:** API da Anthropic (Claude), chamada direto da edge function

## Como rodar localmente

```sh
cd app
npm i
cp .env.example .env   # preencha com os dados do seu projeto Supabase (passo abaixo)
npm run dev             # http://localhost:8080
```

## Colocando no ar — passo a passo

Isso aqui só tem o código. Para funcionar de verdade, faltam três coisas que precisam ser feitas manualmente (não dá pra automatizar sem acesso às suas contas):

### 1. Criar o projeto Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (gratuito para começar).
2. Em **Project Settings → API**, copie a **Project URL** e a **anon public key** para o seu `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
   ```
3. Rode a migration para criar as tabelas (`conversations`, `messages`) com RLS já configurada:
   ```sh
   npx supabase login
   npx supabase link --project-ref xxxxx
   npx supabase db push
   ```
   (ou cole o conteúdo de `supabase/migrations/0001_init.sql` no SQL Editor do painel Supabase).

### 2. Configurar a chave da Anthropic na edge function

1. Crie uma chave em [console.anthropic.com](https://console.anthropic.com) (área de API Keys).
2. Configure como secret da função:
   ```sh
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Publique a função:
   ```sh
   npx supabase functions deploy chat
   ```

   **Custo:** por padrão a função usa `claude-opus-5` (melhor qualidade). Para um assistente de alto volume, `claude-sonnet-5` sai bem mais barato ($2/$10 por milhão de tokens vs $5/$25) com ótima qualidade pra esse tipo de tarefa — pra trocar, defina o secret `ANTHROPIC_MODEL=claude-sonnet-5`.

### 3. Convidar os alunos

Não existe cadastro público de propósito — só quem comprou o curso deve entrar. Convide cada aluno pelo painel do Supabase: **Authentication → Users → Invite user** (envia um e-mail com link para definir senha). Automatizar isso a partir da plataforma de vendas/checkout (webhook de compra aprovada) é um próximo passo natural, mas não está implementado aqui.

### 4. Deploy do frontend

Build de produção:
```sh
cd app
npm run build   # gera app/dist/
```
Como esse app mora na mesma pasta do site, publique `app/dist/` como um **site separado** apontando pra esta pasta (root directory `app`) — por exemplo um subdomínio (`app.domedoaoplay.com.br`) ou um segundo projeto na Vercel/Netlify com "root directory" = `app`. Não dá pra simplesmente publicar a raiz do repositório inteira, senão os dois projetos se misturam. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente de build desse site separado.

## Decisões e próximos passos

- **Fotos não são salvas** — a imagem enviada é analisada na hora e descartada; só o texto da conversa fica no histórico. Se quiser manter um histórico de fotos, dá pra adicionar um bucket no Supabase Storage.
- **Treino de voz/dicção** funciona por transcrição (Web Speech API do navegador, mesma técnica do vanpetrastudio) + feedback em texto — não é análise de áudio em tempo real.
- **Identidade visual** segue o manual de marca do curso (Quicksand/Nunito Sans, azul-aço `#4682B4`, marinho `#0B1728`, laranja `#D77713`).
