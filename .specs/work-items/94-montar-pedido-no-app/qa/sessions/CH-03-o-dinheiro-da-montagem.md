# Sessão CH-03 · O dinheiro da montagem: estoque, promoção, cupom, combinado e preço travado

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-o-dinheiro-da-montagem.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri no WhatsApp · conta: `admin-atelie` (referência do briefing, nunca o valor) |
| Tour · modo | Money · por técnica (valor limite)                                     |
| Rodada      | confirmação                                                            |
| Orçamento   | 23 ações de browser de 25 (mais 2 de saída: limpar a sessão e fechar o browser) |
| Ambiente    | http://localhost:8084 (app do ateliê, feature/94 @ e8b20c6c) · build não exposto · Chromium headless (Playwright MCP) · viewport 390 × 844 |
| Paridade    | Supabase e edge functions locais; `*.supabase.co` bloqueado por rota; Mercado Pago não configurado (de propósito) |

## Missão

Achar qualquer jeito de o total do pedido montado divergir do que a Adri viu na revisão: estoque estourado,
promoção perdida, cupom de primeira compra aceito para quem já comprou, combinado que zera ou fica negativo,
duas propostas no duplo toque, ou link criado com o preço velho.

Nesta rodada de confirmação: só TC-FUNC-017 (BUG-002, duplo toque em "Acrescentar"), TC-FUNC-025 (BUG-001)
com o olhar do dinheiro, e uma tentativa do TC-INT-003.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no app e abriu "Montar pedido"; escolheu a cliente "Bia QA Oitenta e Nove" e tocou em "Continuar" | Passo 2 de 4 · Peças | — |
| 02 | Buscou "Cartier", abriu "QA Corrente Cartier"; a folha abriu em "45 cm · Não · 9 em estoque"; subiu a quantidade a 5 (dois duplos toques em "Uma a mais") | "Acrescentar · R$ 599,50" (5 × R$ 119,90) | — |
| 03 | Tocou duas vezes rápido em "Acrescentar · R$ 599,50" | Um toast só ("Peça acrescentada." / "QA Corrente Cartier · 45 cm · Não"); "Sacola · 5 peças" com **uma linha só**, "5 × R$ 119,90", etiqueta "QA92 Progressiva Cartier · 30%", R$ 599,50; a barra "Itens · 5 peças · frete à parte · R$ 419,65" (= 599,50 − 30 %) | — |
| 04 | Buscou "Cartier" de novo, reabriu a peça na mesma variação e pediu mais 5 (5 já na sacola, 9 em estoque) | "Só há 9 em estoque." (alert) e "Acrescentar · R$ 599,50" desligado — o teto soma a sacola | `screenshots/CH-03-r2-01-teto-soma-sacola.png` |
| 05 | Fechou a folha (Esc) | A sacola segue com uma linha, 5 peças, R$ 419,65; a recusa não mexeu no total. O orçamento chegou a 23 de 25 — encerrada a sessão antes do passo 3 | — |

**Edge cases tentados:** duplo toque em "Acrescentar" com quantidade 5 (uma linha, total certo); teto de estoque somando a sacola depois do duplo toque (recusa, botão desligado, total intacto).

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-FUNC-017 | pass | 02–05 | `screenshots/CH-03-r2-01-teto-soma-sacola.png` | BUG-002 confirmado corrigido com o olhar do dinheiro: o duplo toque com quantidade 5 gera uma linha só, um toast, R$ 599,50 na linha e R$ 419,65 na barra com a promoção de 30 %; o teto que soma a sacola segue valendo depois (5 + 5 > 9 recusado). Só a variação do duplo toque e o passo 4 foram conferidos. A screenshot do instante do duplo toque não foi salva (o caminho foi recusado pelo browser); a prova é o snapshot do passo 03 |
| TC-FUNC-025 | skip | — | — | Orçamento: não houve ações para ir à revisão e criar o link nesta sessão. O BUG-001 (voltar → Montados) já passou no CH-01 desta rodada (`screenshots/CH-01-r2-06-voltar-montados.png`); o total do cartão em Montados contra a revisão não foi reconferido aqui |
| TC-INT-003 | blocked | — | — | ambiente: o Mercado Pago não está configurado no ambiente local (de propósito, informado no briefing), então a conclusão pelo PIX no link não pode acontecer; com o orçamento no fim, o link não foi aberto na loja para reconfirmar a recusa. O mesmo bloqueio da r1 |

Contagem: pass 1 · fail 0 · blocked 1 · skip 1

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-025 com o olhar do dinheiro (o total do cartão em Montados igual ao da revisão; duplo toque em "Criar link") — orçamento de 25 ações esgotou no passo 2; parte das ações foi gasta no login e em dois localizadores que falharam
- TC-INT-003 — Mercado Pago ausente no ambiente local; o link não foi aberto na loja nesta sessão
- Screenshot do instante do duplo toque em "Acrescentar" — o browser recusou gravar fora da raiz do repositório principal; as screenshots seguintes foram gravadas na raiz permitida e movidas
- Saída: a conta não foi encerrada pelo menu "Sair" (sem orçamento); a sessão do app foi apagada limpando o armazenamento do navegador e o browser foi fechado

## Debrief

- **Surpresas:** o MCP de browser só grava screenshot dentro do repositório principal, não no worktree do WI
- **Próximo charter:** se o TC-FUNC-025 precisar do olhar do dinheiro, uma sessão curta só de "Criar link" e Montados, partindo de uma montagem pronta
- **Padrão novo:** duplo toque em "Uma a mais" para chegar à quantidade com metade das ações
