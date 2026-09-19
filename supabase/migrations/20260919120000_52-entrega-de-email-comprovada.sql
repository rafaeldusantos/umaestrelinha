-- =====================================================================
-- 52 · entrega de e-mail comprovada (DLV-15..DLV-20, DLV-23, DLV-24)
--
-- Duas secoes, e ZERO escrita de dado.
--
-- ---------------------------------------------------------------------
-- SECAO 1 -- a nota interna deixa de ser publica
-- ---------------------------------------------------------------------
--
-- `order_notes` e `order_status_history` nasceram em 2026-04 abertas a
-- qualquer sessao (`20260415160758:24-25` e `:40-41`), e desde
-- `20260801130000:29` o schema public carrega `grant all ... to anon`. A
-- combinacao das duas coisas significa, em producao: qualquer sessao anonima
-- le e grava nota interna sobre um pedido. Nesta loja a nota interna registra,
-- as vezes, quem morreu.
--
-- O defeito ja estava NOMEADO POR ESCRITO dentro deste repositorio. O
-- comentario da policy de `customer_notes`, na migration da feature 34
-- (`20260829120000:225-250`), diz que ela NAO copiou o molde de `order_notes`
-- porque "copiar aquele molde ao pe da letra seria copiar um defeito". Esta
-- migration e a volta que a 34 nao deu, e as duas policies abaixo sao
-- literalmente a daquela com o nome da tabela trocado.
--
-- O `with check` e a metade que se esquece. So `using` fecharia a LEITURA e
-- deixaria a GRAVACAO aberta -- e um teste que apenas tentasse ler passaria
-- verde. Por isso os dois lados chamam `has_role`, e por isso o guarda
-- (`entregaDeEmailSchema.test.ts`) tem sensor proprio para a omissao.
--
-- `to authenticated` sozinho NAO basta, e o comentario da 34 ja alertava:
-- toda cliente logada e `authenticated`. Quem decide e `has_role`.
--
-- Ninguem perde acesso com isto. A varredura de 2026-09-19 em `apps/**` e
-- `supabase/functions/**` acha ZERO leitor e ZERO escritor fora do painel
-- (`useAdminOrder.ts`, `useAdminOrders.ts`), que roda com sessao de admin. A
-- `admin-users` conta linhas por service role, que ignora RLS.
--
-- Nao ha `enable row level security` aqui porque as duas tabelas ja o tem
-- desde `20260415160758` -- e porque o `revoke` abaixo tira o alcance de
-- `anon` no nivel do grant, antes de a RLS ser consultada.
--
-- ---------------------------------------------------------------------
-- SECAO 2 -- as pecas de compatibilidade da feature 42 caem
-- ---------------------------------------------------------------------
--
-- A 42 renomeou `order_emails` para `order_notifications` e deixou tres pecas
-- de transicao vivas para cobrir a janela entre o `db push` e o deploy da
-- Vercel, que rodam em paralelo: a view `order_emails` e as duas RPCs que
-- delegam. Essa janela fechou. `notificationSingleOwner.test.ts` assere ZERO
-- leitores da view em `apps/**` e em `supabase/functions/**`, e por isso
-- derruba-las nao quebra consumidor nenhum.
--
-- ORDEM QUE IMPORTA (DLV-22): a function publicada `send-email` -- zumbi, fora
-- do codigo desde `480a171` e ainda ACTIVE no hospedado -- ainda chama
-- `claim_order_email`. Ela e apagada por `functions delete` ANTES do push
-- desta migration. Invertida, a ordem trocaria um endpoint MORTO por um
-- endpoint que responde 500.
--
-- O MOTOR NAO E TOCADO. `order_notifications`, `claim_order_notification` e
-- `finish_order_notification` ficam exatamente como a 42 as deixou, e o guarda
-- assere isso nos DOIS sentidos: as tres pecas de compatibilidade caem E as
-- tres do motor nao. Sem o segundo sentido, uma migration que derrubasse o
-- motor junto passaria.
--
-- IDEMPOTENTE POR CONSTRUCAO: so `drop ... if exists` e `create policy` depois
-- do `drop`. Sem `do $$`, sem backfill, e sem uma unica linha de escrita de
-- dado.
--
-- `AD-017` venceu em 2026-08-17: migration aplicada e imutavel, e correcao vem
-- em migration nova. Nada aqui edita arquivo anterior.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. order_notes -- a nota interna, so para quem administra a loja
-- ---------------------------------------------------------------------

drop policy if exists "Allow all order_notes" on public.order_notes;
drop policy if exists "admin full order_notes" on public.order_notes;

create policy "admin full order_notes" on public.order_notes
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

revoke all on public.order_notes from anon;

comment on table public.order_notes is
	'Nota interna da dona sobre um pedido, as vezes com o nome de quem morreu. Legivel e gravavel SO por admin (has_role no using E no with check) desde a feature 52; antes era aberta a qualquer sessao, inclusive anonima.';

-- ---------------------------------------------------------------------
-- 2. order_status_history -- o mesmo molde, pela mesma razao
-- ---------------------------------------------------------------------
--
-- A nota que acompanha uma mudanca de estado e do mesmo tecido da nota
-- interna: ela diz por que o pedido parou, o que a cliente contou, e as vezes
-- nomeia a pessoa. Fechar uma e deixar a outra aberta seria fechar a porta e
-- esquecer a janela.

drop policy if exists "Allow all order_status_history" on public.order_status_history;
drop policy if exists "admin full order_status_history" on public.order_status_history;

create policy "admin full order_status_history" on public.order_status_history
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

revoke all on public.order_status_history from anon;

comment on table public.order_status_history is
	'Historico de mudanca de estado de um pedido, com a nota que a explica. Legivel e gravavel SO por admin (has_role no using E no with check) desde a feature 52; antes era aberto a qualquer sessao, inclusive anonima.';

-- ---------------------------------------------------------------------
-- 3. As tres pecas de compatibilidade da 42
-- ---------------------------------------------------------------------
--
-- As assinaturas sao as de `20260907120000_42-notificacoes.sql:229` e `:241`.
-- Derrubar por assinatura, e nao por nome, e o que impede a migration de
-- levar junto uma sobrecarga futura de mesmo nome.

drop view if exists public.order_emails;
drop function if exists public.claim_order_email(uuid, text);
drop function if exists public.finish_order_email(uuid, text, text);
