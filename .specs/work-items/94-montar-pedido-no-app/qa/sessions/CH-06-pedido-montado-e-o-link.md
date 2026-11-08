# Sessão CH-06 · O pedido montado e o link que a cliente recebe

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-pedido-montado-e-o-link.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri interrompida · conta: `admin-atelie` · loja: `anonima` (contexto isolado) |
| Tour · modo | Feature · por cenário (J-04)                                           |
| Rodada      | confirmação                                                            |
| Orçamento   | 27 ações de browser de 25 (+2 de encerramento: sair e fechar)          |
| Ambiente    | app `http://localhost:8084` · loja `http://localhost:8082` · build `feature/94` @ `e8b20c6c` (não exposto na tela) · Chromium headless (Playwright MCP) · viewport 390 × 844 |
| Paridade    | Supabase local; Mercado Pago não configurado no local; `*.supabase.co` bloqueado no contexto do app; dados sintéticos de QA |

## Missão

Confirmar que, dias depois, a Adri acha o pedido montado, copia o MESMO link que a cliente tem e que ele abre
na loja com os preços travados — e que nenhuma ação (Editar, Renovar, Cancelar) mata o link sem ela saber.

Nesta rodada: só TC-FUNC-028 (o histórico depois de BUG-009) e uma tentativa de TC-INT-003.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no app e abrir Montados | lista com "Montados · 7 abertos"; P-0039 e P-0038 abertas; nenhuma Expirada na lista | — |
| 02 | Abrir P-0039 (Aberta) | "Editar" e "Cancelar este pedido"; nenhum "Renovar" | — |
| 03 | Tocar em "Cancelar este pedido" | folha "Cancelar P-0039?" / "Quem abrir o link vai ler que este pedido não está mais disponível. Não dá para desfazer." com "Manter" (focado) e "Cancelar pedido" | — |
| 04 | Confirmar "Cancelar pedido" | aviso "Pedido montado cancelado." / "O link deixou de funcionar."; faixa "Cancelado. Quem abrir o link lê que este pedido não está mais disponível."; histórico: **"Cancelado por você"** · 8 nov, acima de "Pedido montado" | `screenshots/CH-06-r2-01-cancelado-por-voce.png` |
| 05 | Voltar para Montados | por ~1 s o cartão ainda dizia "Aberta" e "7 abertos"; em seguida "Cancelada" e "6 abertos" sem nenhum toque | — |
| 06 | Abrir P-0009 (renovada duas vezes em rodadas anteriores) e ler o Histórico | **"Prazo renovado · link novo, o anterior parou de funcionar"** (8 nov e 31 out) e **"Aberto pela cliente"** (8 nov e 31 out) | `screenshots/CH-06-r2-02-historico-renovado.png` |
| 07 | Abrir P-0014 (Concluída) e ler o Histórico | "Helena concluiu no link. O pedido…"; histórico **"Concluído pela cliente · pedido #0366"**, "Aberto pela cliente", "Pedido montado"; link "Ver o pedido #0366" → `/pedidos/<id>` | `screenshots/CH-06-r2-03-historico-concluido.png` |
| 08 | Abrir P-0038 (Aberta) e levar o link à loja numa aba anônima | `/pedido-montado` com "Seu pedido", SEDEX R$ 18,21 ou retirada grátis, PIX −7% escolhido, "Pagar R$ 473,72 com PIX" desabilitado até o CPF | — |
| 09 | Preencher o CPF e tocar em "Pagar R$ 473,72 com PIX" | o aviso de cookies cobria o botão e o toque não pegou; fechado o aviso, o toque levou a "Pedido #0388 · Aguardando pagamento" / "Agora é só o PIX", R$ 473,72, com código para copiar | `screenshots/CH-06-r2-04-loja-pix-pedido-criado.png` |

**Edge cases tentados:** voltar depois de cancelar (passo 05 — a lista se corrige sozinha em ~1 s); foco inicial
da folha de cancelar em "Manter" (passo 03).

## Casos

| TC          | Veredito | Passo | Evidência | Nota |
| ----------- | -------- | ----- | --------- | ---- |
| TC-FUNC-028 | pass     | 02–07 | `screenshots/CH-06-r2-01-cancelado-por-voce.png` · `CH-06-r2-02-historico-renovado.png` · `CH-06-r2-03-historico-concluido.png` | BUG-009 corrigido nas quatro linhas: "Cancelado por você", "Prazo renovado · link novo, o anterior parou de funcionar", "Concluído pela cliente · pedido #0366", "Aberto pela cliente". Os passos 4–5 (renovar) não foram executados ao vivo: não há Expirada na massa (a lista não tem nenhuma) e prepará-la exige mexer no banco — a linha do renovar foi conferida nas renovações já gravadas de P-0009 |
| TC-INT-003  | blocked  | 08–09 | `screenshots/CH-06-r2-04-loja-pix-pedido-criado.png` | passo 1 cumprido: o link concluído com PIX criou o pedido #0388 ("Aguardando pagamento", com código PIX). Os passos 2–4 não foram conferidos: o pagamento não cai sem um Mercado Pago real (ambiente) e o orçamento acabou antes de abrir Montados no app para ver se P-0038 já aparece Concluída |

Contagem: pass 1 · fail 0 · blocked 1 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- Renovar uma Expirada ao vivo (TC-FUNC-028 passos 4–5, a folha e o aviso) — sem Expirada na massa; prepará-la exige a validade passada no banco, fora da caixa-preta
- TC-INT-003 passos 2–4 (o cartão "Concluída · Virou o pedido #0388", "Ver o pedido", a origem "Pedido montado" no painel) — orçamento esgotado e o pagamento PIX não é aprovado sem Mercado Pago
- Duplo toque em "Cancelar pedido" — fora do escopo da confirmação

## Debrief

- **Surpresas:** o PIX gerou código e criou o pedido #0388 mesmo com o Mercado Pago "não configurado" — o bloqueio da r1 era mais estreito do que parecia: a criação passa, falta só a aprovação. Vale conferir, numa próxima sessão, em que estado P-0038 ficou no app (Aberta ou Concluída) com um pedido criado e não pago
- **Próximo charter:** nada
- **Padrão novo:** nada

Sugestões de backlog (não são achados): o aviso de cookies cobre o botão "Pagar … com PIX" em 390 na rota
`/pedido-montado` até ser fechado (pré-existente da loja); a lista de Montados mostra o estado antigo por ~1 s
ao voltar de um cancelamento antes de se corrigir sozinha.
