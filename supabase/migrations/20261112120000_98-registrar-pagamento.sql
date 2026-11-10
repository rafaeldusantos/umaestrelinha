-- =====================================================================
-- O pagamento registrado à mão — um pagamento feito por fora da loja.
-- =====================================================================
--
-- A admin registra, numa tela própria do pedido no painel, um pagamento que a cliente fez por fora
-- (PIX direto, transferência, dinheiro, maquininha), e o pedido passa a se comportar em todo lugar
-- como pago. "Este pedido foi pago?" continua tendo UM dono: a gravação manual produz o mesmo estado
-- que o webhook (`payment_status = 'approved'` + `paid_at`), pelo MESMO corpo de
-- `apply_payment_approval` — a baixa de estoque e o uso do cupom não são copiados.
--
-- Quatro peças:
--   1. `order_manual_payments` — o registro (meio, data, observação, quem registrou, o
--      `payment_status` de antes e as quantidades baixadas, que o desfazer devolve).
--   2. `order_manual_payment_receipts` — os comprovantes (caminho no bucket, tipo, tamanho).
--   3. O bucket PRIVADO `order-payment-receipts`, só admin, lido por URL assinada curta.
--   4. `apply_payment_approval` recriada com a data e o autor, e `record_manual_payment` — na
--      migration seguinte (`20261112130000_98-aprovacao-com-data-e-autor.sql`), sozinhas: o guarda
--      `pagamentoMarcaPagoSchema.test.ts` lê a migration VIGENTE da função como um arquivo dela.
--
-- Observação, meio e comprovante NUNCA viram coluna de `orders`: a cliente lê a linha inteira do
-- pedido dela (a policy da dona não recorta coluna, `get-order` devolve a linha, o Realtime a
-- publica). Por isso tabelas próprias, só de admin. `orders.payment_method` não muda.

-- ---------------------------------------------------------------------
-- 1 · O registro
-- ---------------------------------------------------------------------
--
-- Todos os campos do formulário são opcionais; a data cai em "agora" quando não vem. O meio é a lista
-- fixa `MANUAL_PAYMENT_METHODS` de `@estrelinha/core/orders` (cópia deliberada, guardada por
-- `registroManualSchema.test.ts`). O teto da observação é `MANUAL_PAYMENT_NOTE_MAX`.
--
-- O autor é `on delete set null` com o NOME gravado no momento (o painel não lê `auth.users`).
-- `undone_*` são do desfazer, que vem depois — esta migration só cria as colunas.
--
-- Um pedido tem no máximo UM registro vivo (`undone_at is null`): o índice parcial é a segunda
-- trava contra o registro em dobro (a primeira é o `paid_at is null` de `apply_payment_approval`).

create table if not exists public.order_manual_payments (
	id                      uuid primary key default gen_random_uuid(),
	order_id                uuid not null references public.orders (id) on delete cascade,
	method                  text check (method in ('pix_direto', 'transferencia', 'dinheiro', 'cartao', 'outro')),
	paid_at                 timestamptz not null,
	note                    text check (note is null or char_length(btrim(note)) between 1 and 1000),
	created_by              uuid references auth.users (id) on delete set null,
	created_by_name         text,
	created_at              timestamptz not null default now(),
	previous_payment_status text not null,
	stock_deducted          jsonb not null default '[]'::jsonb,
	undone_at               timestamptz,
	undone_by               uuid references auth.users (id) on delete set null,
	undone_by_name          text,
	undone_reason           text
);

create unique index if not exists order_manual_payments_um_vivo
	on public.order_manual_payments (order_id)
	where undone_at is null;

create index if not exists order_manual_payments_order_id on public.order_manual_payments (order_id);

-- ---------------------------------------------------------------------
-- 2 · Os comprovantes
-- ---------------------------------------------------------------------
--
-- Até três por registro (a RPC confere), JPG, PNG, WebP, HEIC ou PDF, 10 MB cada. O arquivo mora no
-- bucket; aqui fica o caminho, o tipo e o tamanho.

create table if not exists public.order_manual_payment_receipts (
	id                uuid primary key default gen_random_uuid(),
	manual_payment_id uuid not null references public.order_manual_payments (id) on delete cascade,
	path              text not null unique,
	content_type      text not null check (content_type in (
		'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'
	)),
	size_bytes        integer not null check (size_bytes between 1 and 10485760),
	created_at        timestamptz not null default now()
);

create index if not exists order_manual_payment_receipts_payment
	on public.order_manual_payment_receipts (manual_payment_id);

-- RLS — só o admin lê e grava. O `revoke` tira o anon do caminho antes do RLS; a policy exige
-- `has_role` no `using` E no `with check`. `to authenticated` sozinho não basta: toda cliente logada
-- é `authenticated`. O painel GRAVA só pela RPC; a policy de escrita fica para não haver um segundo
-- caminho com outra regra.

alter table public.order_manual_payments enable row level security;
alter table public.order_manual_payment_receipts enable row level security;

revoke all on table public.order_manual_payments from anon;
revoke all on table public.order_manual_payments from public;
revoke all on table public.order_manual_payment_receipts from anon;
revoke all on table public.order_manual_payment_receipts from public;

drop policy if exists "admin full order manual payments" on public.order_manual_payments;
create policy "admin full order manual payments" on public.order_manual_payments
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin full order manual payment receipts" on public.order_manual_payment_receipts;
create policy "admin full order manual payment receipts" on public.order_manual_payment_receipts
	for all to authenticated
	using (public.has_role(auth.uid(), 'admin'))
	with check (public.has_role(auth.uid(), 'admin'));

comment on table public.order_manual_payments is
	'Pagamento registrado a mao no painel. SO admin (has_role no using E no with check). Nunca coluna de orders: a cliente le a linha do pedido inteira.';
comment on table public.order_manual_payment_receipts is
	'Comprovantes do pagamento registrado a mao (caminho no bucket privado order-payment-receipts). SO admin.';

-- ---------------------------------------------------------------------
-- 3 · O bucket privado
-- ---------------------------------------------------------------------
--
-- `public = false`: sem policy de leitura pública, e o objeto só abre por URL assinada (curta, gerada
-- pelo painel de quem é admin). Comprovante é dado pessoal e financeiro.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'order-payment-receipts', 'order-payment-receipts', false, 10485760,
	array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update set
	public = false,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read payment receipts" on storage.objects;
create policy "Admins can read payment receipts"
on storage.objects for select to authenticated
using (
	bucket_id = 'order-payment-receipts'
	and public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Admins can upload payment receipts" on storage.objects;
create policy "Admins can upload payment receipts"
on storage.objects for insert to authenticated
with check (
	bucket_id = 'order-payment-receipts'
	and public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Admins can delete payment receipts" on storage.objects;
create policy "Admins can delete payment receipts"
on storage.objects for delete to authenticated
using (
	bucket_id = 'order-payment-receipts'
	and public.has_role(auth.uid(), 'admin')
);
