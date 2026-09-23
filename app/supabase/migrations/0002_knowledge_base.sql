-- Base de conhecimento do método "Do Medo ao Play", consultada pelo assistente
-- antes de responder. Editável direto pelo Table Editor do Supabase (Authentication
-- não é necessária: só a edge function, via service_role, lê esta tabela).
--
-- category sugerida: 'setup' (áudio/luz/altura/apoio), 'tema' (temas e
-- palavras-chave), 'roteiro' (critérios de revisão), 'voz' (voz e dicção),
-- 'tecnica' (dúvidas técnicas comuns), 'metodo' (princípios gerais do curso).

create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('setup', 'tema', 'roteiro', 'voz', 'tecnica', 'metodo')),
  title text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_base_category_idx on public.knowledge_base(category) where active;

alter table public.knowledge_base enable row level security;

-- Ninguém acessa via API pública (nem aluno logado): só a edge function,
-- que usa a service_role key e portanto ignora RLS por completo.
revoke all on public.knowledge_base from anon, authenticated;

-- Exemplos de formato — apague e substitua pelo conteúdo real do método.
-- Sem eles, a IA responde só com conhecimento geral (como já fazia antes).
insert into public.knowledge_base (category, title, content) values
  ('metodo', '[EXEMPLO — apague] Princípio central do método', 'Substitua por: qual é o pilar/frase que resume o método "Do Medo ao Play"? O que NUNCA deve ser dito a um aluno?'),
  ('setup', '[EXEMPLO — apague] Critério oficial de avaliação de luz', 'Substitua por: os critérios exatos que vocês usam pra dizer se uma luz está boa (ex: direção em relação à janela, distância, o que é aceitável x o que precisa mudar).'),
  ('tecnica', '[EXEMPLO — apague] Pergunta frequente real', 'Substitua por uma dúvida técnica comum dos alunos + a resposta padrão de vocês (ex: "posso gravar só com o microfone do celular?").');
