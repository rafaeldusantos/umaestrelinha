# 76 — Decisões do Specify (context)

Respondidas pelo validador independente em 2026-10-24 sobre as perguntas levantadas pelo Specify.
Registro formal: `AD-060` em `.specs/STATE.md`.

| # | Decisão | Motivo | Divergência do rascunho |
| --- | --- | --- | --- |
| Q1 | `customer_notes` fica fora: nem ler, nem escrever | fora do protótipo; a RLS devolve vazio a conta sem papel (leitura exigiria `lerComPapel`) e escrever exigiria porta nova com guarda de ação; nota sobre luto é o dado mais sensível | rascunho deixava "ler/escrever/nenhum" em aberto |
| Q2b | "Em aberto" = `payment_status = 'approved'` e `status` em `pending`/`paid`/`separating`/`shipped` | a regra do rascunho (não `delivered`/`cancelled`) contaria para sempre os `pending` com Pix expirado/rejeitado/cancelado (9 de 54 no banco local); coerente com "Precisa de ação" e com o par do `AD-055` | `SPEC_DEVIATION`: altera o critério 2 do rascunho |
| Q3 | coluna `orders_open` no fim de `customer_stats` e `customer_list`, migration aditiva; predicado em `core`, cópia SQL guardada byte a byte (molde `filaComDonoUnico`); guarda de schema por comando (`L-033`) | RPC própria seria a terceira escrita da regra; filtrar no cliente traria a base inteira; `select('*')` do painel não muda. Ordem: migration, depois bundle | rascunho não tinha coluna |
| A8 | ordem por `last_activity_at`; a linha mostra a última compra paga (`last_order_at`), "Sem compra paga ainda" para quem nunca pagou | distinção `CLI-05` do painel | declarada na spec para não parecer inconsistência |
| A13 | `whatsappChatUrl` em `core` ao lado de `normalizeBrPhone` (`.ts`, sem import); `BlocoCliente` da `74` passa a usá-lo sem mudar a saída; guarda `whatsappComDonoUnico` no mobile-adm (âncora dupla, sensores) | `whatsappHref` só existe na loja e exige mensagem; sem isso nasce a terceira cópia do `wa.me` | `SPEC_DEVIATION`: o rascunho previa `whatsappHref` |

Reuso e recortes: ver *Reuso* na `spec.md`. Os recortes "Com pedido em aberto" e "Compraram mais de uma
vez" vão para `core/customers` (`MAC-23`).
