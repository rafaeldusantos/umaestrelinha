-- =====================================================================
-- 42 · notificações: uma memória com canal, e os textos no banco (NTF-01, PNL-06)
--
-- O QUE ESTAVA ERRADO ANTES DESTA MIGRATION
--
-- A memória de "já avisei esta cliente?" era `order_emails`, e o nome era a
-- limitação: a tabela só sabia de e-mail, o `check` de `type` só conhecia os
-- quatro momentos em que a loja falava, e não havia onde a Adri ler ou mudar o
-- texto do que saía no nome dela. A feature 43 (WhatsApp) precisaria de uma
-- segunda tabela igual — dois donos da mesma pergunta, o "defeito 01".
--
-- O QUE ESTA MIGRATION FAZ
--
-- 1. `order_emails` vira `order_notifications` por RENAME, não por cópia:
--    preserva id, FK, RLS, policy e as linhas que já existem.
-- 2. `type` vira `event`; entram `channel` (default 'email') e `delivery_status`
--    (nula até a 43 — é o custo declarado da separação, pago aqui uma vez).
-- 3. O `check` de `event` passa a ser a lista COMPLETA de `NOTIFICATION_EVENTS`
--    (`packages/core/src/notifications/events.ts`), na mesma ordem.
--    `orderNotificationsSchema.test.ts` lê este arquivo do disco e compara nos
--    dois sentidos.
-- 4. O índice único passa a ser `(order_id, event, channel)` — NÃO parcial, pelo
--    mesmo motivo da `20260730120000_order_emails.sql`: ele é o ponto de
--    serialização do `on conflict`, e um índice `where status = 'sent'` só
--    detectaria a colisão depois da entrega.
-- 5. RPCs novas, `claim_order_notification` e `finish_order_notification`, no
--    molde das antigas (uma statement, `security definer`, só `service_role`).
-- 6. As RPCs ANTIGAS passam a DELEGAR para as novas, com `channel = 'email'`.
-- 7. `order_emails` volta a existir como VIEW `security_invoker` sobre a tabela.
--
-- POR QUE A VIEW E A DELEGAÇÃO, EM VEZ DE APAGAR
--
-- O `db push` e o deploy da Vercel/functions rodam em PARALELO (lição da 39): por
-- alguns minutos a edge function `send-email` publicada ainda chama
-- `claim_order_email` e o painel publicado ainda lê `order_emails`. Com a view e
-- a delegação, o código antigo continua funcionando na janela; sem elas, todo
-- e-mail do caixa falharia e o histórico do pedido quebraria até o deploy
-- terminar. A view sai numa migration posterior, quando nenhum deploy vivo a ler
-- — e o guarda `notificationSingleOwner.test.ts` (T18) impede que uma tela nova
-- volte a lê-la.
--
-- OS TEXTOS (PNL-06)
--
-- `store_settings.notifications` nasce com `DEFAULT_NOTIFICATIONS`
-- (`packages/core/src/notifications/defaults.ts`) serializado — os quatro
-- e-mails que já saem LIGADOS com o texto de hoje, byte a byte; os onze novos
-- DESLIGADOS até a Adri ler. `on conflict (key) do nothing`: a segunda execução
-- não desfaz o que ela editou. `storeSettingsDefaults.test.ts` faz `JSON.parse`
-- do trecho abaixo e compara com o TypeScript.
--
-- IDEMPOTENTE POR CONSTRUÇÃO
--
-- Rename de tabela e de coluna dentro de `do $$` guardado pelo estado do
-- catálogo; `add column if not exists`; `drop constraint if exists` antes de
-- cada `add constraint`; `create or replace` nas funções e na view; `do nothing`
-- na semente. Segunda execução afeta zero linhas.
--
-- `AD-017` venceu em 2026-08-17: migration aplicada é imutável. Nada aqui edita
-- a `20260730120000_order_emails.sql` nem a `20260811120000_22-material-afetivo.sql`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. `order_emails` → `order_notifications` (rename, guardado)
--
-- `pg_tables` lista só TABELAS: depois desta migration `order_emails` é uma
-- view, e o bloco não pode confundir uma com a outra na segunda execução.
-- ---------------------------------------------------------------------
do $$
begin
	if exists (
		select 1 from pg_tables where schemaname = 'public' and tablename = 'order_emails'
	) and not exists (
		select 1 from pg_tables where schemaname = 'public' and tablename = 'order_notifications'
	) then
		alter table public.order_emails rename to order_notifications;
	end if;
end
$$;

-- ---------------------------------------------------------------------
-- 2. `type` → `event`; `channel` e `delivery_status`
-- ---------------------------------------------------------------------
do $$
begin
	if exists (
		select 1 from information_schema.columns
		 where table_schema = 'public' and table_name = 'order_notifications' and column_name = 'type'
	) and not exists (
		select 1 from information_schema.columns
		 where table_schema = 'public' and table_name = 'order_notifications' and column_name = 'event'
	) then
		alter table public.order_notifications rename column type to event;
	end if;
end
$$;

alter table public.order_notifications
	add column if not exists channel text not null default 'email',
	add column if not exists delivery_status text;

alter table public.order_notifications drop constraint if exists order_notifications_channel_check;
alter table public.order_notifications
	add constraint order_notifications_channel_check
	check (channel in ('email', 'whatsapp'));

alter table public.order_notifications drop constraint if exists order_notifications_delivery_status_check;
alter table public.order_notifications
	add constraint order_notifications_delivery_status_check
	check (delivery_status is null or delivery_status in ('sent_to_server', 'delivered', 'read'));

-- ---------------------------------------------------------------------
-- 3. O `check` de `event` = NOTIFICATION_EVENTS, na ordem da jornada
--
-- O nome antigo (`order_emails_type_check`) sobreviveu ao rename da tabela e
-- ainda conhece só quatro valores; cai antes do novo entrar.
-- ---------------------------------------------------------------------
alter table public.order_notifications drop constraint if exists order_emails_type_check;
alter table public.order_notifications drop constraint if exists order_notifications_event_check;
alter table public.order_notifications
	add constraint order_notifications_event_check
	check (event in (
		'order_received',
		'order_paid',
		'material_instructions',
		'payment_rejected',
		'pix_expired',
		'order_cancelled',
		'payment_refunded',
		'material_tracking_registered',
		'material_received',
		'in_production',
		'order_shipped',
		'order_delivered',
		'post_delivery_care',
		'owner_order_paid',
		'owner_material_incoming'
	));

-- O `check` de `status` não muda de conteúdo; só ganha o nome da tabela nova.
alter table public.order_notifications drop constraint if exists order_emails_status_check;
alter table public.order_notifications drop constraint if exists order_notifications_status_check;
alter table public.order_notifications
	add constraint order_notifications_status_check
	check (status in ('pending', 'sent', 'failed'));

-- ---------------------------------------------------------------------
-- 4. O índice único passa a incluir o canal — e continua NÃO parcial
-- ---------------------------------------------------------------------
drop index if exists public.order_emails_order_type;
create unique index if not exists order_notifications_order_event_channel
	on public.order_notifications (order_id, event, channel);

alter index if exists public.idx_order_emails_order_id rename to idx_order_notifications_order_id;

-- RLS: a mesma política de leitura (só admin, via has_role), com o nome novo.
-- Nenhuma política de ESCRITA — quem escreve é a service role, pelas RPCs.
alter table public.order_notifications enable row level security;

drop policy if exists "admin read order_emails" on public.order_notifications;
drop policy if exists "admin read order_notifications" on public.order_notifications;
create policy "admin read order_notifications" on public.order_notifications
	for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 5. claim_order_notification / finish_order_notification
--
-- Molde de `claim_order_email`: UMA statement, sem corrida. O Postgres devolve
-- zero linhas quando o `where` do `do update` é falso, então "já enviado" e
-- "reivindicado agora" se distinguem por ter ou não recebido um id. Linha em
-- `failed` é reivindicável de novo (retentativa manual); só `sent` é terminal.
-- ---------------------------------------------------------------------
create or replace function public.claim_order_notification(
	p_order_id uuid,
	p_event text,
	p_channel text
)
returns uuid
language sql
security definer
set search_path = public
as $$
	insert into public.order_notifications as n (order_id, event, channel, status)
	values (p_order_id, p_event, p_channel, 'pending')
	on conflict (order_id, event, channel) do update
		set status = 'pending',
			attempts = n.attempts + 1,
			error = null,
			sent_at = null
	where n.status <> 'sent'
	returning n.id;
$$;

create or replace function public.finish_order_notification(
	p_id uuid,
	p_provider_message_id text,
	p_error text
)
returns void
language sql
security definer
set search_path = public
as $$
	update public.order_notifications
	set status = case when p_error is null then 'sent' else 'failed' end,
		sent_at = case when p_error is null then now() else null end,
		provider_message_id = coalesce(p_provider_message_id, provider_message_id),
		error = p_error
	where id = p_id;
$$;

revoke all on function public.claim_order_notification(uuid, text, text) from public;
revoke all on function public.claim_order_notification(uuid, text, text) from anon;
revoke all on function public.claim_order_notification(uuid, text, text) from authenticated;
grant execute on function public.claim_order_notification(uuid, text, text) to service_role;

revoke all on function public.finish_order_notification(uuid, text, text) from public;
revoke all on function public.finish_order_notification(uuid, text, text) from anon;
revoke all on function public.finish_order_notification(uuid, text, text) from authenticated;
grant execute on function public.finish_order_notification(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 6. As RPCs antigas DELEGAM — a janela de deploy fica coberta
--
-- `create or replace` preserva a ACL que a `20260730120000` deu (só
-- service_role). O corpo antigo fazia `on conflict (order_id, type)` sobre um
-- índice que o passo 4 derrubou — sem esta troca, a function publicada morreria
-- na primeira chamada.
-- ---------------------------------------------------------------------
create or replace function public.claim_order_email(
	p_order_id uuid,
	p_type text
)
returns uuid
language sql
security definer
set search_path = public
as $$
	select public.claim_order_notification(p_order_id, p_type, 'email');
$$;

create or replace function public.finish_order_email(
	p_id uuid,
	p_provider_message_id text,
	p_error text
)
returns void
language sql
security definer
set search_path = public
as $$
	select public.finish_order_notification(p_id, p_provider_message_id, p_error);
$$;

-- ---------------------------------------------------------------------
-- 7. `order_emails` como VIEW de compatibilidade
--
-- `security_invoker`: a RLS de `order_notifications` vale para quem consulta a
-- view — o admin vê, mais ninguém. As colunas são as da tabela antiga, com
-- `event` exposto como `type`, para o painel publicado continuar lendo.
-- ---------------------------------------------------------------------
create or replace view public.order_emails
	with (security_invoker = true)
	as
	select id, order_id, event as type, status, attempts, provider_message_id, error, created_at, sent_at
	  from public.order_notifications
	 where channel = 'email';

grant select on public.order_emails to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 8. Os textos — `store_settings.notifications` nasce com os defaults
--
-- O jsonb abaixo é `DEFAULT_NOTIFICATIONS` serializado, gerado a partir do
-- TypeScript (`packages/core/src/notifications/defaults.ts`), não escrito à
-- mão. `storeSettingsDefaults.test.ts` faz `JSON.parse` deste trecho e exige
-- igualdade com o objeto — divergir não quebra build nem tipo, só faz a loja
-- mostrar um texto antes de a linha chegar do banco e outro depois.
--
-- `on conflict (key) do nothing`: a segunda execução (e todo `db push` futuro)
-- não sobrescreve o que a Adri editou nem religa o que ela desligou.
-- ---------------------------------------------------------------------
insert into public.store_settings (key, value)
values ('notifications', $notifications$
{
  "events": {
    "order_received": {
      "email": {
        "enabled": true,
        "fields": {
          "subject": "Pedido {{numero_pedido}} recebido — aguardando o PIX",
          "heading": "Recebemos seu pedido!",
          "lead": "{{saudacao}}Seu PIX foi gerado e o pedido está reservado por 30 minutos. Assim que o pagamento cair, a gente te avisa por aqui.",
          "extra": [
            "Status: aguardando pagamento do PIX (30 minutos)"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "order_paid": {
      "email": {
        "enabled": true,
        "fields": {
          "subject": "Pagamento aprovado — pedido {{numero_pedido}}",
          "heading": "Pagamento aprovado!",
          "lead": "{{saudacao}}Recebemos seu pagamento. Agora é com a gente — seu pedido entra na fila de produção.",
          "extra": [
            "Status: pagamento aprovado"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "order_shipped": {
      "email": {
        "enabled": true,
        "fields": {
          "subject": "Pedido {{numero_pedido}} enviado — código de rastreio",
          "heading": "Seu pedido saiu para entrega!",
          "lead": "{{saudacao}}Postamos seu pedido com {{transportadora}}. Use o código abaixo para acompanhar.",
          "extra": [
            "Código de rastreio: {{rastreio}}"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "material_received": {
      "email": {
        "enabled": true,
        "fields": {
          "subject": "Recebemos seu material — pedido {{numero_pedido}}",
          "heading": "Seu material chegou até nós",
          "lead": "{{saudacao}}Seu material chegou em segurança ao ateliê e já está guardado com cuidado. A partir de agora, sua joia entra em produção — e a gente avisa assim que ela for postada.",
          "extra": [
            "Status: material recebido — em produção",
            "Usamos apenas a quantidade necessária, e todo o excedente volta junto com a sua joia."
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "material_instructions": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Pedido {{numero_pedido}} pago — agora é a sua parte",
          "heading": "Agora é a sua parte",
          "lead": "{{saudacao}}Recebemos seu pagamento. Para começar a sua joia, precisamos do material que você vai enviar. O guia em {{link_guia_material}} explica como preparar e postar, com calma e sem pressa.",
          "extra": [
            "Endereço do ateliê: {{endereco_atelie}}",
            "Dúvidas: WhatsApp {{whatsapp_atendimento}}",
            "Status: aguardando o seu material"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "payment_rejected": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Não conseguimos aprovar o pagamento do pedido {{numero_pedido}}",
          "heading": "O pagamento não foi aprovado",
          "lead": "{{saudacao}}A operadora do cartão não aprovou o pagamento do pedido {{numero_pedido}}. Nada foi cobrado. Se quiser, tente de novo com outro cartão ou por PIX em {{link_pedido}}.",
          "extra": [
            "Status: pagamento recusado"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "pix_expired": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "O PIX do pedido {{numero_pedido}} expirou",
          "heading": "O PIX expirou",
          "lead": "{{saudacao}}O PIX do pedido {{numero_pedido}} não foi pago dentro do prazo e perdeu a validade. Se ainda quiser a peça, é só gerar um novo em {{link_pedido}} — o pedido continua guardado.",
          "extra": [
            "Status: PIX expirado — pedido não pago"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "order_cancelled": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Pedido {{numero_pedido}} cancelado",
          "heading": "Seu pedido foi cancelado",
          "lead": "{{saudacao}}O pedido {{numero_pedido}} foi cancelado. Se houve pagamento, o valor volta pelo mesmo meio em que foi feito. Qualquer dúvida, fale com a gente pelo WhatsApp {{whatsapp_atendimento}}.",
          "extra": [
            "Status: cancelado"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "payment_refunded": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Estorno do pedido {{numero_pedido}}",
          "heading": "O valor foi estornado",
          "lead": "{{saudacao}}Fizemos o estorno de {{total}} do pedido {{numero_pedido}}. O prazo para o valor aparecer depende do banco ou da operadora do cartão — em geral, de alguns dias a duas faturas.",
          "extra": [
            "Status: estornado"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "material_tracking_registered": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Rastreio do material registrado — pedido {{numero_pedido}}",
          "heading": "Registramos o rastreio do seu material",
          "lead": "{{saudacao}}Anotamos o código {{rastreio}} do envelope com o seu material. Vamos acompanhar a chegada e avisar assim que ele estiver aqui, em segurança.",
          "extra": [
            "Código de rastreio do material: {{rastreio}}",
            "Status: material a caminho do ateliê"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "in_production": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Sua joia entrou em produção — pedido {{numero_pedido}}",
          "heading": "Sua joia está sendo feita",
          "lead": "{{saudacao}}A produção da sua joia começou. Cada peça é feita à mão e leva o tempo que precisa — a gente avisa assim que ela for postada.",
          "extra": [
            "Status: em produção"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "order_delivered": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Pedido {{numero_pedido}} entregue",
          "heading": "Sua joia chegou",
          "lead": "{{saudacao}}O pedido {{numero_pedido}} consta como entregue. Esperamos que a peça esteja do jeito que você imaginou. Se algo não estiver certo, fale com a gente pelo WhatsApp {{whatsapp_atendimento}}.",
          "extra": [
            "Status: entregue"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "post_delivery_care": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Como cuidar da sua joia — pedido {{numero_pedido}}",
          "heading": "Como cuidar da sua joia",
          "lead": "{{saudacao}}Faz alguns dias que a sua joia chegou. Para ela durar, evite perfume, álcool e produtos de limpeza sobre a resina, guarde longe do sol e limpe com um pano macio e seco. Se sobrou material, ele voltou junto com a peça, para você guardar como preferir.",
          "extra": [
            "Dúvidas sobre cuidados: WhatsApp {{whatsapp_atendimento}}"
          ],
          "cta_label": "Acompanhar em Minha conta"
        }
      }
    },
    "owner_order_paid": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Pedido {{numero_pedido}} pago — {{primeiro_nome}}",
          "heading": "Pedido pago",
          "lead": "O pedido {{numero_pedido}} de {{primeiro_nome}} foi pago: {{total}}. Confira os itens e se há material a esperar em {{link_pedido_admin}}.",
          "extra": [
            "Abrir no painel: {{link_pedido_admin}}"
          ],
          "cta_label": "Abrir o pedido no painel"
        }
      }
    },
    "owner_material_incoming": {
      "email": {
        "enabled": false,
        "fields": {
          "subject": "Material a caminho — pedido {{numero_pedido}}",
          "heading": "Material a caminho",
          "lead": "{{primeiro_nome}} registrou o rastreio {{rastreio}} do material do pedido {{numero_pedido}}. Acompanhe a chegada e confirme o recebimento em {{link_pedido_admin}}.",
          "extra": [
            "Rastreio do material: {{rastreio}}",
            "Abrir no painel: {{link_pedido_admin}}"
          ],
          "cta_label": "Abrir o pedido no painel"
        }
      }
    }
  },
  "post_delivery_days": 7
}
$notifications$::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 9. O que cada coisa é, por escrito
-- ---------------------------------------------------------------------
comment on table public.order_notifications is
	'A memória de "já avisei?" — uma linha por (pedido, evento, canal). Era order_emails até a feature 42; renomeada, não copiada. Escrita SÓ pelas RPCs claim_order_notification/finish_order_notification (service_role). O check de event copia NOTIFICATION_EVENTS de @estrelinha/core/notifications, e orderNotificationsSchema.test.ts compara os dois.';

comment on column public.order_notifications.event is
	'O evento da jornada do pedido (NOTIFICATION_EVENTS, em @estrelinha/core/notifications). Era a coluna type de order_emails.';

comment on column public.order_notifications.channel is
	'email ou whatsapp. O WhatsApp é a feature 43; nesta, todo registro nasce email.';

comment on column public.order_notifications.delivery_status is
	'Só para canais com confirmação de entrega (WhatsApp, feature 43): sent_to_server, delivered, read. Nula no e-mail. Nasce aqui para a 43 não reabrir esta tabela.';

comment on view public.order_emails is
	'VIEW DE COMPATIBILIDADE (feature 42) sobre order_notifications, channel = email, com event exposto como type. Existe para o painel e a edge function PUBLICADOS continuarem funcionando entre o db push e o deploy. Nenhuma tela nova pode lê-la (notificationSingleOwner.test.ts); sai em migration posterior.';

-- ---------------------------------------------------------------------
-- 10. O PostgREST precisa saber que a tabela mudou de nome
--
-- É o PRIMEIRO rename de tabela viva do repositório — nenhuma migration
-- anterior precisou disto. O PostgREST guarda o schema em cache e, sem o
-- sinal, continuaria servindo `order_emails` como tabela e desconhecendo
-- `order_notifications` por alguns segundos (ou até o próximo reload), o que
-- faria o motor novo receber 404 na primeira leitura depois do deploy.
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
