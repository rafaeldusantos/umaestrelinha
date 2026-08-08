-- Feature 17 / T3 — a escrita da promoção é ATÔMICA, e a vitrine do kit é exclusiva.
--
-- PRM-02, PRM-05, PRM-08.
--
-- Por que RPC e não três mutações do client:
--
-- Gravar uma promoção toca TRÊS tabelas — `promotions`, `promotion_tiers`, `promotion_categories`.
-- Do `supabase-js` isso seria um `upsert` seguido de dois `delete` + dois `insert`: cinco requisições
-- HTTP, cinco transações independentes. A segunda falhar deixa promoção **meio-salva** — faixas novas
-- com categorias velhas, ou promoção sem faixa nenhuma —, e não existe rollback do lado do cliente.
-- É o que `PRM-02` / `PRM-08` proíbem explicitamente ("nada é gravado e o erro é exibido").
--
-- Um corpo plpgsql roda dentro da transação da statement que o chamou, e o PostgREST envolve cada
-- request numa transação. Logo: uma exceção em qualquer ponto desfaz TUDO, incluindo a linha de
-- `promotions` recém-inserida. Molde de `claim_order_email` / `increment_coupon_usage` — security
-- definer com `search_path` fixo e `revoke`/`grant` nominais.

-- ---------------------------------------------------------------------
-- set_kit_showcase — liga a nova, desliga a anterior
-- ---------------------------------------------------------------------
--
-- POR QUE DUAS STATEMENTS E NÃO UMA:
--
-- A forma óbvia é uma statement só —
--
--     update public.promotions set is_kit_showcase = (id = p_promotion_id)
--      where is_kit_showcase or id = p_promotion_id;
--
-- — e ela funciona **às vezes**, que é pior do que nunca funcionar. Índice único não é verificado no
-- fim da statement: cada tupla nova é inserida no índice na hora, e a linha que ainda vai ser
-- desligada continua viva ali. Então o resultado depende da ORDEM FÍSICA em que o scan alcança as
-- duas linhas. Medido neste banco, com o mesmo comando:
--
--     vitrine atual inserida primeiro → UPDATE 2, funciona
--     vitrine ALVO   inserida primeiro → ERROR: duplicate key value violates unique constraint
--                                        "promotions_single_kit_showcase"  DETAIL: Key ((true))=(t)
--
-- Um bug que aparece conforme a ordem de inserção das linhas é exatamente o tipo que passa em dev e
-- explode em produção. E não há como tornar o índice `deferrable`: só CONSTRAINT aceita
-- `deferrable`, e `unique constraint` não aceita cláusula `where` — um índice único PARCIAL não pode
-- ser constraint. Então a resposta correta é duas statements, na ordem "desliga antes de ligar",
-- dentro de uma transação. A garantia que interessa — atômico, e no máximo uma vitrine — está
-- preservada; o que muda é a contagem de statements.
--
-- SPEC_DEVIATION: a task pedia "na mesma statement".
-- Reason: impossível com índice único parcial não-deferrable, e a versão de uma statement falha de
-- forma dependente da ordem física das linhas (medição acima). A propriedade exigida — exatamente uma
-- vitrine, tudo ou nada — é a mesma.
create or replace function public.set_kit_showcase(p_promotion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if not public.has_role(auth.uid(), 'admin') then
		raise exception 'Apenas administradores podem definir a vitrine do kit'
			using errcode = '42501';
	end if;

	-- Desliga ANTES de ligar: invertido, o índice único recusa.
	update public.promotions
	   set is_kit_showcase = false
	 where is_kit_showcase
	   and id <> p_promotion_id;

	update public.promotions
	   set is_kit_showcase = true
	 where id = p_promotion_id;

	if not found then
		raise exception 'Promoção % não existe', p_promotion_id
			using errcode = 'P0002';
	end if;
end;
$$;

comment on function public.set_kit_showcase(uuid) is
	'Marca a promoção como vitrine do kit (feature 18) e desmarca a anterior, atomicamente. O índice único parcial promotions_single_kit_showcase é a rede; esta função é a ergonomia.';

-- ---------------------------------------------------------------------
-- upsert_promotion — promoção + faixas + categorias, tudo ou nada
-- ---------------------------------------------------------------------
--
-- CONTRATO DO PAYLOAD
--
--   {
--     "id": null | "<uuid>",              -- ausente/null ⇒ cria
--     "name": "Kit de bottons",
--     "scope": "categories" | "all",
--     "discount_kind": "unit_price" | "percent",
--     "stacks_with_coupon": false,
--     "is_kit_showcase": false,
--     "active": true,
--     "valid_from": null | "<timestamptz>",
--     "valid_until": null | "<timestamptz>",
--     "tiers": [{ "min_qty": 3, "value": 5.00 }, …],
--     "category_ids": ["<uuid>", …]
--   }
--
-- Semântica de campo AUSENTE, e por que ela não é detalhe:
--
--   * na CRIAÇÃO, campo ausente cai no default da coluna;
--   * na EDIÇÃO, campo ausente fica INALTERADO.
--
-- `tiers` e `category_ids` seguem a mesma regra, e é a que evita perda de dado: **ausente = não
-- mexer; presente = SUBSTITUIR pelo conteúdo** (inclusive por lista vazia, que apaga tudo). Sem essa
-- distinção, uma ação de "pausar" que mandasse só `{ id, active: false }` apagaria as faixas e os
-- vínculos da promoção — silenciosamente, e no meio de uma tela cuja única intenção era desligar um
-- interruptor.
--
-- O que esta função NÃO valida, de propósito:
--
--   * promoção sem NENHUMA faixa, e promoção sem NENHUMA categoria, são estados **legais** — a spec
--     os cobre como edge case ("sem faixas ⇒ nenhum desconto"; "sem vínculo ⇒ não desconta de
--     ninguém, nunca vira toda a loja"). E o segundo é alcançável sem passar por aqui: apagar a
--     categoria dispara `on delete cascade`. Recusá-los aqui tornaria irrepresentável um estado que
--     o banco produz sozinho.
--   * as regras de faixa (`min_qty >= 2`, sem duplicata, `percent` em 1–90) — quem as aplica são os
--     `check` e o trigger da T1. Repetir a validação aqui criaria um segundo dono da mesma regra.
--     A tela valida antes (`zod`) para dar mensagem por campo; o banco valida sempre.
create or replace function public.upsert_promotion(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_id       uuid := nullif(payload->>'id', '')::uuid;
	v_showcase boolean;
begin
	if not public.has_role(auth.uid(), 'admin') then
		raise exception 'Apenas administradores podem gravar promoções'
			using errcode = '42501';
	end if;

	if payload->>'name' is null or btrim(payload->>'name') = '' then
		raise exception 'A promoção precisa de um nome'
			using errcode = '23514';
	end if;

	-- Marcar a vitrine aqui exige desligar a anterior ANTES de escrever esta linha — senão o índice
	-- único recusa a própria gravação. Reusa `set_kit_showcase` para a regra ter um dono só.
	v_showcase := (payload->>'is_kit_showcase')::boolean;
	if coalesce(v_showcase, false) then
		update public.promotions
		   set is_kit_showcase = false
		 where is_kit_showcase
		   and (v_id is null or id <> v_id);
	end if;

	if v_id is null then
		insert into public.promotions (
			name, type, scope, discount_kind,
			stacks_with_coupon, is_kit_showcase, active,
			valid_from, valid_until
		) values (
			payload->>'name',
			coalesce(payload->>'type', 'progressive_qty'),
			coalesce(payload->>'scope', 'categories'),
			payload->>'discount_kind',
			coalesce((payload->>'stacks_with_coupon')::boolean, false),
			coalesce(v_showcase, false),
			coalesce((payload->>'active')::boolean, true),
			nullif(payload->>'valid_from', '')::timestamptz,
			nullif(payload->>'valid_until', '')::timestamptz
		)
		returning id into v_id;
	else
		update public.promotions p set
			name               = payload->>'name',
			scope              = coalesce(payload->>'scope', p.scope),
			discount_kind      = coalesce(payload->>'discount_kind', p.discount_kind),
			stacks_with_coupon = coalesce((payload->>'stacks_with_coupon')::boolean, p.stacks_with_coupon),
			is_kit_showcase    = coalesce(v_showcase, p.is_kit_showcase),
			active             = coalesce((payload->>'active')::boolean, p.active),
			-- `valid_from`/`valid_until` são anuláveis DE VERDADE: "chave ausente" e "chave com null"
			-- têm de significar coisas diferentes, senão não há como LIMPAR uma vigência.
			valid_from         = case when payload ? 'valid_from'
			                          then nullif(payload->>'valid_from', '')::timestamptz
			                          else p.valid_from end,
			valid_until        = case when payload ? 'valid_until'
			                          then nullif(payload->>'valid_until', '')::timestamptz
			                          else p.valid_until end
		where p.id = v_id;

		if not found then
			raise exception 'Promoção % não existe', v_id
				using errcode = 'P0002';
		end if;
	end if;

	if payload ? 'tiers' then
		delete from public.promotion_tiers where promotion_id = v_id;

		insert into public.promotion_tiers (promotion_id, min_qty, value)
		select v_id, (t->>'min_qty')::integer, (t->>'value')::numeric(10,2)
		  from jsonb_array_elements(payload->'tiers') t;
	end if;

	if payload ? 'category_ids' then
		delete from public.promotion_categories where promotion_id = v_id;

		insert into public.promotion_categories (promotion_id, category_id)
		select v_id, (c#>>'{}')::uuid
		  from jsonb_array_elements(payload->'category_ids') c;
	end if;

	return v_id;
end;
$$;

comment on function public.upsert_promotion(jsonb) is
	'Grava promoção + faixas + vínculos de categoria numa única transação (PRM-02/PRM-08). Campo ausente: cai no default ao criar, fica inalterado ao editar. `tiers`/`category_ids` ausentes NÃO são tocados; presentes SUBSTITUEM (lista vazia apaga).';

-- ---------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------
--
-- `security definer` faz estas funções rodarem como o dono e passarem POR CIMA da RLS — é o que dá a
-- atomicidade, e é exatamente por isso que o papel `admin` é checado DENTRO de cada uma. Sem o
-- `revoke` abaixo, `grant execute` chegaria a `public` por herança e qualquer visitante da loja
-- poderia chamar; a checagem interna barraria, mas a superfície não deve nem existir.
--
-- Sem grant para `service_role` de propósito: nada no servidor grava promoção (a edge function só
-- LÊ), e a service role já tem acesso direto às tabelas. Além disso `auth.uid()` é nulo sob service
-- role, então a checagem de papel recusaria a chamada de qualquer forma.
revoke all on function public.set_kit_showcase(uuid) from public;
revoke all on function public.set_kit_showcase(uuid) from anon;
grant execute on function public.set_kit_showcase(uuid) to authenticated;

revoke all on function public.upsert_promotion(jsonb) from public;
revoke all on function public.upsert_promotion(jsonb) from anon;
grant execute on function public.upsert_promotion(jsonb) to authenticated;
