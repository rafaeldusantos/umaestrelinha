-- =====================================================================
-- Feature 22 — Material afetivo
-- MAT-02, MAT-05, MAT-07, MAT-08, MAT-09, MAT-11
-- =====================================================================
--
-- Uma joia afetiva não é um produto que chega: a cliente precisa ENVIAR PELO CORREIO um material
-- insubstituível — cinzas de cremação, leite materno, um cacho de cabelo, o primeiro dente do filho.
-- Se esse material se perde, não existe segunda via. Esta migration cria o que a operação precisa
-- para saber, a qualquer momento, quais pedidos ainda esperam material e quais já podem ser feitos.
--
-- Três decisões deste arquivo não são óbvias e estão escritas onde valem:
--   1. `products.requires_material` é NULLABLE, e `null` significa "nunca decidido".
--   2. `orders.material_tracking_code` NÃO é `orders.tracking_code` — são remessas opostas.
--   3. A escrita de estado só existe por RPC. Nenhuma policy de UPDATE em `orders` é aberta (PAY-10).

-- ---------------------------------------------------------------------
-- 1 · products — o material é propriedade do PRODUTO
-- ---------------------------------------------------------------------
--
-- A primeira redação da spec dizia que a cliente escolheria o material na página do produto. O
-- catálogo real contradiz: ZERO das 3.356 variações tem eixo de material, e o material está no NOME
-- do produto (169 dizem "leite", 127 "cinzas", 85 "cabelo", 51 "coto"). Pior: existe peça chamada
-- "Árvore da Vida com Cabelo E Coto Umbilical" — ali "escolha o material" não é incompleto, é errado.
--
-- E "exige material" e "quais materiais" são DOIS DADOS, não um. A leitura preguiçosa seria "lista
-- vazia ⇒ não exige", e ela apaga exatamente a peça de material livre: a que exige, entra na fila, e
-- ainda não sabe qual — porque a escolha acontece no WhatsApp, fora da loja.

alter table public.products
	-- NULLABLE de propósito, SEM default: `null` = "ninguém decidiu ainda".
	--
	-- Sem esse terceiro estado não existe resposta para "esta linha já foi curada?", e o importador
	-- do catálogo (que roda de novo a cada sincronização) apagaria a curadoria da dona toda vez.
	-- Quem lê nunca compara a coluna crua — passa por `requiresMaterial()` de
	-- `@estrelinha/core/material`, onde `null` é `false`, que é o comportamento seguro.
	add column if not exists requires_material boolean,
	add column if not exists material_kinds text[] not null default '{}'::text[],
	-- `null` cai em `DEFAULT_ENGRAVING_MAX_CHARS` (20) no TypeScript. NÃO é "sem limite": um pingente
	-- não comporta o que uma pulseira comporta, e sem teto um texto colado de mil caracteres entra no
	-- pedido e a Adri descobre na bancada.
	add column if not exists engraving_max_chars integer;

comment on column public.products.requires_material is
	'null = nunca decidido (marcador para a semente do importador); true/false = decisão da dona. Leia por requiresMaterial() de @estrelinha/core/material, nunca cru.';
comment on column public.products.material_kinds is
	'Quais materiais a peça incorpora. VAZIA COM requires_material=true é estado válido: é a peça de material livre, combinada no WhatsApp.';

-- A lista fechada existe também aqui, e não só em TypeScript: valor torto gravado por qualquer
-- caminho viraria rótulo em branco na loja, sem erro em lugar nenhum.
alter table public.products drop constraint if exists products_material_kinds_check;
alter table public.products
	add constraint products_material_kinds_check
	check (material_kinds <@ array[
		'leite_materno', 'cabelo', 'cinzas', 'pelo_pet', 'dente_leite',
		'coto_umbilical', 'placenta', 'flores', 'penas', 'outro'
	]::text[]);

alter table public.products drop constraint if exists products_engraving_max_chars_check;
alter table public.products
	add constraint products_engraving_max_chars_check
	check (engraving_max_chars is null or (engraving_max_chars between 1 and 200));

-- ---------------------------------------------------------------------
-- 2 · orders — o estado do material, independente do de pagamento
-- ---------------------------------------------------------------------

alter table public.orders
	add column if not exists material_status text not null default 'nao_aplicavel',
	add column if not exists material_tracking_code text,
	add column if not exists material_received_at timestamptz;

comment on column public.orders.material_tracking_code is
	'Rastreio da remessa DE ENTRADA: cliente -> ateliê, o envelope com o material. NÃO CONFUNDIR com orders.tracking_code, que é a remessa DE SAÍDA (ateliê -> cliente) e alimenta o e-mail order_shipped. Reusar aquela coluna faria "postamos sua joia" sair com o código do envelope que a cliente mandou.';
comment on column public.orders.material_received_at is
	'Quando o material chegou ao ateliê. Existe pelo mesmo motivo de paid_at: uma fila sem carimbo não responde "há quanto tempo".';

alter table public.orders drop constraint if exists orders_material_status_check;
alter table public.orders
	add constraint orders_material_status_check
	check (material_status in (
		'nao_aplicavel', 'aguardando_material', 'material_enviado', 'material_recebido', 'em_producao'
	));

-- Índice PARCIAL: a fila é o caso, e `nao_aplicavel` é a maioria silenciosa. Indexar tudo pagaria
-- escrita em todo pedido de acessório para nunca ser lido.
create index if not exists idx_orders_material_status
	on public.orders (material_status)
	where material_status <> 'nao_aplicavel';

-- ---------------------------------------------------------------------
-- 3 · order_items — SNAPSHOT, e por isso redundante de propósito
-- ---------------------------------------------------------------------
--
-- Repetir o que `products` já diz não é descuido: o pedido é FOTO. Mudar a exigência no cadastro não
-- pode alterar pedido já criado, e ler do produto no momento da consulta faria o pedido de ontem
-- mudar de conteúdo hoje. Mesma razão de `variant_label` e `variant_options`.

alter table public.order_items
	add column if not exists requires_material boolean not null default false,
	add column if not exists material_kinds text[] not null default '{}'::text[],
	add column if not exists engraving_text text;

comment on column public.order_items.engraving_text is
	'O texto que a cliente pediu para gravar. Snapshot: sobrevive a mudança do limite no cadastro, ainda que passe a excedê-lo.';

-- ---------------------------------------------------------------------
-- 4 · order_emails aceita o quinto tipo
-- ---------------------------------------------------------------------
--
-- A idempotência sai de graça: `claim_order_email` (AD-006) já serializa por (order_id, type) sobre
-- índice único NÃO parcial. Só o allow-list precisa crescer.

alter table public.order_emails drop constraint if exists order_emails_type_check;
alter table public.order_emails
	add constraint order_emails_type_check
	check (type in ('order_received', 'order_paid', 'order_shipped', 'material_received'));

-- ---------------------------------------------------------------------
-- 5 · set_material_status — a transição, guardada e idempotente (MAT-08)
-- ---------------------------------------------------------------------
--
-- ⚠️ O bloco `case p_status when … then array[…]` abaixo é a MÁQUINA DE ESTADO, e ela tem uma cópia
-- em TypeScript (`MATERIAL_TRANSITIONS` em `@estrelinha/core/material`). Duas cópias da mesma regra é
-- o "defeito 01" do projeto, e aqui é aceito por um motivo específico: só o banco impede uma
-- requisição forjada, e só o TypeScript produz o motivo legível que a AC 3 exige. A contrapartida
-- obrigatória é `materialTransitions.test.ts`, que LÊ ESTE ARQUIVO DO DISCO e compara os dois
-- conjuntos. Editar as listas aqui sem editar o core derruba a suíte — que é o ponto.
--
-- Cada lista é `materialTransitionSources(alvo)`: as origens de onde se chega ao alvo, INCLUINDO o
-- próprio alvo. Incluir o alvo é o que torna a transição idempotente — duas admins clicando ao mesmo
-- tempo convergem para o resultado de uma só, sem estado intermediário inválido.
--
-- `aguardando_material` está entre as origens de `material_recebido` porque o SALTO DIRETO é
-- obrigatório: informar o rastreio é opcional, então a maioria dos pedidos nunca passa por
-- `material_enviado`.
create or replace function public.set_material_status(
	p_order_id uuid,
	p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_allowed text[];
	v_new text;
	v_current text;
begin
	if not public.has_role(auth.uid(), 'admin') then
		return jsonb_build_object('ok', false, 'status', null, 'reason', 'not_admin');
	end if;

	v_allowed := case p_status
		when 'nao_aplicavel'       then array['nao_aplicavel']
		when 'aguardando_material' then array['aguardando_material']
		when 'material_enviado'    then array['aguardando_material', 'material_enviado']
		when 'material_recebido'   then array['aguardando_material', 'material_enviado', 'material_recebido']
		when 'em_producao'         then array['material_recebido', 'em_producao']
		else null
	end;

	if v_allowed is null then
		return jsonb_build_object('ok', false, 'status', null, 'reason', 'invalid_status');
	end if;

	-- Sem checar-antes-de-escrever: o `where` É a guarda, e é ele que sobrevive à concorrência.
	-- Molde de `apply_payment_approval`.
	update public.orders
	set material_status = p_status,
		-- Só carimba na PRIMEIRA vez. Reexecutar não reescreve a data, senão "há quanto tempo o
		-- material chegou" reiniciaria a cada clique repetido.
		material_received_at = case
			when p_status = 'material_recebido' and material_received_at is null then now()
			else material_received_at
		end
	where id = p_order_id
		and material_status = any(v_allowed)
	returning material_status into v_new;

	if found then
		return jsonb_build_object('ok', true, 'status', v_new, 'reason', null);
	end if;

	-- Não aplicou. Descobrir por quê — sem isto a admin recebe "não deu" e nada mais.
	select material_status into v_current from public.orders where id = p_order_id;
	if not found then
		return jsonb_build_object('ok', false, 'status', null, 'reason', 'order_not_found');
	end if;

	return jsonb_build_object('ok', false, 'status', v_current, 'reason', 'invalid_transition');
end;
$$;

-- ---------------------------------------------------------------------
-- 6 · set_material_tracking — o rastreio da remessa DA CLIENTE (MAT-11)
-- ---------------------------------------------------------------------
--
-- `orders` NÃO tem policy de UPDATE para cliente, de propósito (PAY-10 — para ninguém adulterar
-- `payment_status` nem os valores). Então isto NÃO é um PATCH: é uma RPC `security definer` que
-- escreve UM campo, do próprio pedido de quem chama.
--
-- Uma RPC só para os dois lados (cliente e admin), e não duas: a Adri também registra o código, é o
-- caso de a cliente avisar pelo WhatsApp. Duas funções seriam duas máquinas de estado, e a segunda
-- divergiria da primeira no primeiro ajuste.
create or replace function public.set_material_tracking(
	p_order_id uuid,
	p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_code text;
	v_current text;
	v_next text;
begin
	v_code := nullif(btrim(coalesce(p_code, '')), '');
	if v_code is null then
		return jsonb_build_object('ok', false, 'status', null, 'reason', 'empty_code');
	end if;

	-- Autorização e leitura na MESMA consulta: "não é seu" e "não existe" respondem igual, de
	-- propósito. Distinguir os dois entregaria a existência de pedidos alheios.
	select o.material_status into v_current
	from public.orders o
	where o.id = p_order_id
		and (
			public.has_role(auth.uid(), 'admin')
			or o.customer_id in (select c.id from public.customers c where c.user_id = auth.uid())
		);

	if not found then
		return jsonb_build_object('ok', false, 'status', null, 'reason', 'not_allowed');
	end if;

	if v_current = 'nao_aplicavel' then
		return jsonb_build_object('ok', false, 'status', v_current, 'reason', 'material_not_applicable');
	end if;

	-- O estado só AVANÇA, e só a partir de `aguardando_material`. De `material_recebido` em diante o
	-- código é registrado e o estado NÃO volta para trás (MAT-11 AC 12) — a cliente que só agora
	-- lembrou de informar o código não pode desfazer o que a Adri já conferiu na bancada.
	v_next := case when v_current = 'aguardando_material' then 'material_enviado' else v_current end;

	update public.orders
	set material_tracking_code = v_code,
		material_status = v_next
	where id = p_order_id;

	return jsonb_build_object('ok', true, 'status', v_next, 'reason', null);
end;
$$;

-- Privilégio mínimo, molde de `apply_payment_approval`. `anon` não alcança nenhuma das duas: o
-- rastreio exige identidade, e o caminho alternativo (avisar a Adri) continua valendo.
revoke all on function public.set_material_status(uuid, text) from public;
revoke all on function public.set_material_status(uuid, text) from anon;
grant execute on function public.set_material_status(uuid, text) to authenticated;

revoke all on function public.set_material_tracking(uuid, text) from public;
revoke all on function public.set_material_tracking(uuid, text) from anon;
grant execute on function public.set_material_tracking(uuid, text) to authenticated;

-- NENHUMA policy de UPDATE em `orders` é criada aqui. PAY-10 permanece intacta, e é isso que faz o
-- rastreio da cliente ser a única coisa que ela consegue escrever no próprio pedido.
