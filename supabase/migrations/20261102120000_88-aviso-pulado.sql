-- Feature 88 — o aviso à cliente vira escolha (`AD-069`, que estende a `AD-032`).
--
-- Dois blocos, nenhuma escrita de dado:
--
-- 1. O `check` de `order_notifications.status` recriado com `skipped`. A linha `skipped` é a memória de
--    "a Adri escolheu não avisar a cliente deste evento": o motor a grava quando o gatilho chega com
--    `customer: false` (só pela porta `trigger` do painel, que exige admin). A migration da `42` não é
--    editada (`AD-017`): a constraint é derrubada e criada de novo aqui, e esta passa a ser a vigente.
--
-- 2. `public.skip_order_notification(p_order_id, p_event, p_channel)` — grava `skipped` numa única
--    statement, no molde de `claim_order_notification`. As transições (design, *Data Models*):
--      (nenhuma) / `failed` / `skipped` ⇒ `skipped` (devolve o id)
--      `sent`    ⇒ intocada (devolve null: o e-mail já saiu, não há o que pular)
--      `pending` ⇒ intocada (devolve null: o envio em curso vence)
--    Ao virar `skipped`, a linha renova `created_at` (Verifier r1, `AVS-12`): o histórico a mostra na
--    hora DA ESCOLHA, e não na do `failed` antigo ou do primeiro pulo.
--    `claim_order_notification` NÃO muda: o recorte dela (status diferente de `sent`) já reivindica uma
--    linha `skipped`, e é isso que deixa o avião do histórico (a porta `send`) e um gatilho futuro sem
--    a opção enviarem o e-mail pulado (`AVS-13`, `AVS-24`).
--    `security definer` com `search_path` vazio, e `execute` só para a service role — quem chama é o
--    motor `send-notification`, nunca o navegador.
--
-- A forma é guardada por `avisoPuladoSchema.test.ts` (suíte da loja), que lê este arquivo; a semântica
-- (as quatro transições e as permissões) é provada pelo probe
-- `.specs/features/88-aviso-opcional-nas-acoes-do-pedido/probes/01-aviso-pulado.sql` contra o banco local.
-- ---------------------------------------------------------------------------------------------

-- ---------------------------------------------------------------------------------------------
-- 1. O status novo na memória de envio. Recriado aqui; o da `42` deixa de ser o vigente.
-- ---------------------------------------------------------------------------------------------
alter table public.order_notifications drop constraint if exists order_notifications_status_check;
alter table public.order_notifications
  add constraint order_notifications_status_check
  check (status in ('pending', 'sent', 'failed', 'skipped'));

-- ---------------------------------------------------------------------------------------------
-- 2. skip_order_notification
-- ---------------------------------------------------------------------------------------------
create or replace function public.skip_order_notification(
  p_order_id uuid,
  p_event text,
  p_channel text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.order_notifications as n (order_id, event, channel, status)
  values (p_order_id, p_event, p_channel, 'skipped')
  on conflict (order_id, event, channel) do update
    set status = 'skipped',
      error = null,
      created_at = now()
  where n.status in ('failed', 'skipped')
  returning n.id;
$$;

revoke all on function public.skip_order_notification(uuid, text, text) from public;
revoke all on function public.skip_order_notification(uuid, text, text) from anon;
revoke all on function public.skip_order_notification(uuid, text, text) from authenticated;
grant execute on function public.skip_order_notification(uuid, text, text) to service_role;

notify pgrst, 'reload schema';
