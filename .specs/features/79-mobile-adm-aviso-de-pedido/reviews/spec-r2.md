# Revisão — Specify (rodada 2)
Veredito: APROVADO

> Nota de caminho (mesma da r1): a pasta pedida `81-79-…` não tem `spec.md`. A spec revisada é
> `.specs/features/79-mobile-adm-aviso-de-pedido/spec.md` (341 linhas, modificada em 2026-10-25 10:26,
> depois da r1). Não há `context.md`; as decisões estão na tabela de assunções.

## Situação dos achados da rodada 1

| r1 | Situação | Onde foi resolvido |
| --- | --- | --- |
| R1 — "Reenviar" numa linha de push | resolvido | `MAN-38` (sem "Reenviar" no painel nem no app; o e-mail continua com ele) e A13 |
| R2 — porta de escrita × RLS × guardas | resolvido | A16 (porta no servidor, RPC `security definer` ou function, sem policy para cliente nenhum), `MAN-23` reescrito, e a lista de guardas estendidos por entrada literal (`escritaSoPelaPorta`, `marcacaoSoPorAcao`, `chaveDeServidorForaDoNavegador`, `orderNotificationsSchema`, `swSemDadosDaLoja`, `rotasSobGuarda`) |
| R3 — "tela de saída" inexistente | resolvido | A7 e `MAN-30`: a escolha acontece no menu da conta, com "Sair mesmo assim" / "Tentar de novo", sem limpeza automática depois |
| R4 — `MAN-21` e o `@estrelinha/auth` | resolvido | A17 (mudança aditiva: `state` no `Navigate`), `MAN-21` com a regra de origem (`/` e não `//`) e o painel mantendo o destino. Conferido: `AdminLoginPage.tsx:42` navega fixo para `/admin` e não lê `state`, então o painel de fato não muda |
| R5 — mobile/layout/acessibilidade | resolvido | `MAN-39`..`MAN-41` (quatro viewports × 100/130/200 %, 44 px, nome acessível, `aria-busy`, `motion-reduce:`) e a linha na varredura |
| R6 — "reivindicada uma vez" × `failed` | resolvido | `MAN-05` (a linha `failed` volta a sair na retentativa, incluindo `budget_exhausted`) e `MAN-07` ("não retenta dentro do mesmo envio") |
| R7 — `{v}` e rótulo do canal | resolvido | `MAN-08` nomeia `formatPrice` (com centavos) e A13/`MAN-34` usam `Celular` no padrão de `rotuloDoCanal` |
| R8 — persistência/publicação | resolvido | linha "Persistência e publicação" (`MAN-42`): `check` recriado em migration nova e ordem migration → secrets → functions → bundle |
| R9 — caminho `81-79` | não é da spec | a spec usa `79`, coerente com o programa; o prefixo `81-79` é do pedido de revisão. Fica como observação, não como achado |

## Achados

### R1 — `MAN-38` não diz em que lugar da linha a frase aparece, e o `error` de `MAN-09` a esconderia (menor)
- Onde: `spec.md:262-264` (`MAN-38`: "o histórico SHALL dizer 'O aviso no celular não chegou.'") e `spec.md:154-156` (`MAN-09`: `failed` "com o motivo" em `error`). Código: `packages/core/src/orders/history.ts:148-158` — o título da falha é `Falha ao enviar o aviso: <nome> (<canal>)` e o detalhe é `e.error ?? 'A cliente NÃO foi avisada'`.
- Problema: com `error` sempre preenchido para push `failed` (`MAN-09`), o detalhe mostraria o motivo técnico, e a frase de `MAN-38` só apareceria se o Design trocar o título ou ignorar `error`. A spec não diz se a frase substitui o título, o detalhe, ou ambos, nem se o motivo continua visível.
- Cenário: o Design mantém a forma de hoje, a linha diz "Falha ao enviar o aviso: Pedido pago (Celular)" com "a 0 de 2 aparelhos: 429" embaixo; o teste de `MAN-38` procura a frase e reprova, ou é escrito frouxo (`toContain` em qualquer nó).
- Sugestão: dizer em `MAN-38` que a frase é o **detalhe** da linha de push `failed` (no lugar de `e.error`/"A cliente NÃO foi avisada"), e que o título segue o padrão de hoje com `(Celular)`. Pode ficar para o Design.

### R2 — A recusa do teto de `MAN-33` não tem frase na tela (menor)
- Onde: `spec.md:250-251` (`MAN-33`: "o servidor SHALL recusar (teto por conta)") e `MAN-32` (frase só para "o teste falha no servidor").
- Problema: não está dito se a recusa por teto mostra a frase de `MAN-32` ("O aviso de teste não saiu. Tente de novo.") — que manda tentar de novo justamente quando tentar de novo é recusado — ou outra frase, nem se o botão fica desabilitado nos 30 s.
- Sugestão: dar a frase da recusa por teto (ex.: "Espere alguns segundos para mandar outro teste.") ou dizer que o botão fica desabilitado por 30 s depois do envio.

### R3 — Ordem das assunções (menor)
- Onde: `spec.md:62-64` — A16 e A17 vêm antes de A15.
- Problema: só leitura; quem procura A15 pela ordem não a acha onde espera.
- Sugestão: reordenar A15 antes de A16.

## Conferido sem achado
- Todo requisito novo (`MAN-38`..`MAN-42`) tem ID e critério testável; a rastreabilidade cobre `MAN-01`..`MAN-42` (42 no total).
- Os quatro nomes de `MAN-40` são exatamente os de `NOTIFICATION_EVENT_NAMES` (`packages/core/src/notifications/catalog.ts:96-99`).
- `formatPrice` existe em `packages/core/src/formatters/price.ts:11`, sem imports (alcançável pelo Deno), com centavos — `MAN-08` é assertável.
- `rotuloDoCanal` (`history.ts:96-97`) devolve `E-mail`/`WhatsApp`; `Celular` segue o mesmo padrão "(Canal)" de `history.ts:149-150`.
- O guarda `orderNotificationsSchema.test.ts` existe (`apps/store/src/shared/lib/__tests__/`), então a extensão declarada tem alvo real.
- O histórico do app lê `order_notifications` (`apps/mobile-adm/src/entities/order/api/usePedido.ts:62`) e não tem "Reenviar" de e-mail hoje — `MAN-38` "no app" é coerente.
- `MAN-23` sem policy nem `grant` para `anon`/`authenticated` é compatível com a porta `security definer`/function de A16 e com `MAN-27` (troca de dono do `endpoint`), que a RLS "só as próprias" impedia na r1.
- `MAN-21`: a regra "começa com uma `/` e não com duas" fecha o redirecionamento aberto; o painel não lê `state` hoje.
- Assunções não confirmadas continuam marcadas `n` com a escolha registrada; A10 e A11 delegam ao Design o que depende de pesquisa (lista de hosts, biblioteca), sem inventar API.
- Escopo e fora de escopo explícitos; `payment/**` declarado intocado nos critérios de sucesso.
