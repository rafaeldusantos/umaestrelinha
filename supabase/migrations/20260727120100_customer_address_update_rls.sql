-- =====================================================================
-- M2 · RLS: UPDATE do próprio registro em customers e addresses
--          (PGD-05, ADR-03 · decisão de RLS escopada em STATE.md 2026-07-18)
--
-- Hoje 20260414121021_*.sql:202-208 cria apenas SELECT e INSERT nas duas
-- tabelas. Consequência em produção: `packages/auth/src/AuthContext.tsx:160-164`
-- já tenta atualizar `customers.name` e falha **em silêncio** — o PostgREST
-- devolve 0 linhas, sem `error`, porque não há policy de UPDATE. O mesmo
-- aconteceria com `customers.cpf` (PGD-03): o PIX sairia sem pagador.
--
-- POR QUE ESCREVER `WITH CHECK` EXPLICITAMENTE:
--   `USING`      filtra quais linhas o UPDATE **enxerga** (a linha ANTES da edição).
--   `WITH CHECK` valida a linha **DEPOIS** da edição — é o que impede a cliente de,
--                no próprio UPDATE, gravar `user_id = <outra pessoa>` (ou, em
--                addresses, `customer_id = <outro cliente>`) e assim entregar o
--                próprio registro para outra conta.
--
--   Correção factual (medida no banco local em 2026-07-27, ver roteiro abaixo):
--   omitir `WITH CHECK` NÃO deixa a tabela aberta. O Postgres, numa policy de
--   UPDATE sem `WITH CHECK`, **reaproveita a expressão do `USING` como check da
--   linha nova** — então, com `USING (user_id = auth.uid())`, a reatribuição já
--   seria barrada de qualquer forma. O `WITH CHECK` explícito vale por outro
--   motivo, esse sim comprovado: ele **desacopla** a garantia de escrita da
--   expressão de leitura. Medido: com `USING (true)` e sem `WITH CHECK`, o mesmo
--   UPDATE de reatribuição **passa** pela RLS (só esbarrou no índice único de
--   user_id); com `USING (true) WITH CHECK (user_id = auth.uid())`, é barrado.
--   Ou seja: no dia em que alguém alargar o `USING` (um OR de admin, um `true`
--   temporário para depurar), o check da linha nova alarga junto e em silêncio —
--   a não ser que ele esteja escrito à parte, como está aqui.
--
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE.
-- =====================================================================

DROP POLICY IF EXISTS "users update own customer" ON public.customers;
CREATE POLICY "users update own customer"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users update own addresses" ON public.addresses;
CREATE POLICY "users update own addresses"
  ON public.addresses
  FOR UPDATE
  TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- =====================================================================
-- ROTEIRO MANUAL DE VERIFICAÇÃO — "autenticada A não atualiza registro de B"
--
-- Rodar no banco local (docker exec supabase_db_<projeto> psql -U postgres).
-- Substituir <A> e <B> pelos uuid de auth.users de duas contas distintas.
-- `set local role authenticated` + `request.jwt.claims` é o que faz auth.uid()
-- responder como a sessão de uma cliente logada.
--
--   BEGIN;
--     SET LOCAL role authenticated;
--     SET LOCAL request.jwt.claims = '{"sub":"<A>","role":"authenticated"}';
--
--     -- 1) A tenta alterar o cliente de B  → esperado: UPDATE 0 (barrado pelo USING)
--     UPDATE public.customers SET name = 'invadido' WHERE user_id = '<B>';
--
--     -- 2) A tenta alterar o endereço de B → esperado: UPDATE 0 (barrado pelo USING)
--     UPDATE public.addresses SET street = 'invadido'
--      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = '<B>');
--
--     -- 3) A tenta DOAR a própria linha para B → esperado: ERRO
--     --    "new row violates row-level security policy" (barrado pelo WITH CHECK)
--     UPDATE public.customers SET user_id = '<B>' WHERE user_id = '<A>';
--
--     -- 3b) A tenta reatribuir o PRÓPRIO endereço ao cliente B → esperado: ERRO
--     UPDATE public.addresses SET customer_id =
--            (SELECT id FROM public.customers WHERE user_id = '<B>')
--      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = '<A>');
--
--     -- 4) A atualiza o PRÓPRIO cpf → esperado: UPDATE 1 (o caminho felizes de PGD-03)
--     UPDATE public.customers SET cpf = '39053344705' WHERE user_id = '<A>';
--
--     -- 5) A atualiza o PRÓPRIO endereço → esperado: UPDATE 1
--     UPDATE public.addresses SET street = 'Rua A editada'
--      WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = '<A>');
--   ROLLBACK;
--
-- RESULTADO MEDIDO em 2026-07-27 no banco local (postgres 17, supabase_db_uma-estrelinha-store):
--   1)  UPDATE 0                                                    → USING barra
--   2)  UPDATE 0                                                    → USING barra
--   3)  ERROR 42501 new row violates RLS policy for table customers → WITH CHECK barra
--   3b) ERROR 42501 new row violates RLS policy for table addresses → WITH CHECK barra
--   4)  UPDATE 1, cpf = 39053344705                                 → caminho felizes ok
--   5)  UPDATE 1                                                    → caminho felizes ok
--   E as linhas de B seguiram intactas ("Cliente B" / "Rua de Cliente B").
--
-- Nota de setup: `auth.users` tem trigger `handle_new_customer`, que já cria a linha
-- em `customers` — inserir o usuário com `email` preenchido e depois só ajustar o nome,
-- em vez de inserir `customers` à mão (o INSERT manual quebra na FK).
-- =====================================================================
