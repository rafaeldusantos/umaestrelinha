# Sessão CH-04 · Voltar, sair e o rascunho da montagem

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-voltar-sair-e-rascunho.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri interrompida · conta: `admin-atelie` (credencial do arquivo local do QA, nunca o valor) |
| Tour · modo | Back-Button · com tour                                                 |
| Rodada      | confirmação                                                            |
| Orçamento   | 25 ações de browser de 35 (cada chamada de `run_code` com uma sequência curta de gestos contada como uma ação) |
| Ambiente    | http://localhost:8084 · `feature/94` @ `e8b20c6c` · Chromium headless (Playwright MCP) · viewport 390 × 844 |
| Paridade    | Supabase local (API 54441) com edge functions locais; `*.supabase.co` bloqueado; voltar do Android simulado por `history.back`; dado de cliente do banco local |

## Missão

Confirmar que o voltar do Android, o "x", o F5 e o app fechado no meio nunca jogam fora a sacola sem
perguntar, nunca refazem o que já foi confirmado, que depois de "Criar link" o voltar leva a Montados sem
reabrir a montagem, e que o que volta do aparelho é só peças e descontos — nenhum dado da cliente.

Nesta rodada de confirmação: só TC-FUNC-004 (BUG-007) e TC-FUNC-003 (BUG-001, com o olhar de PER-02, retomando um rascunho), e o entorno imediato das correções.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entra no ateliê e toca "Montar pedido" sem rascunho no aparelho | `/pedidos/montar`, passo 1; `localStorage` só com a sessão; `history.state` `{doApp, passoDaMontagem:1}` idx 2 | — |
| 02 | Escolhe uma cliente cadastrada (`cliente.qa@…`) e usa o voltar | Abre "Sair sem criar o link?" ("Nada foi gravado ainda…", Continuar montando / Sair); a folha agora é uma entrada do histórico (`folhaDaTela: "sair-da-montagem"`, idx 3) | `screenshots/CH-04-r2-01-folha-sair-so-cliente.png` |
| 03 | Voltar de novo, com a folha aberta | A folha fecha; fica no passo 1 com a cliente escolhida (idx 2). Um terceiro voltar reabre a folha (a sentinela do passo 1), nunca sai sozinho | — |
| 04 | "Continuar montando", segue ao passo 2, abre a folha da variação e acrescenta uma peça | A folha da variação entra no histórico (idx 4) e sai ao acrescentar; rascunho gravado: só `pecas`, `cupom`, `combinado` e `conta` (id da conta) — nenhum nome, e-mail, telefone ou endereço | — |
| 05 | Voltar ao passo 1 e voltar de novo | Folha de sair com "Guardar rascunho" | `screenshots/CH-04-r2-02-folha-sair-com-pecas.png` |
| 06 | Voltar com essa folha aberta | A folha fecha, passo 1, cliente e sacola mantidas (idx 2) — BUG-007 não reproduz | `screenshots/CH-04-r2-03-voltar-fecha-folha.png` |
| 07 | Abre a folha de novo e toca "Guardar rascunho"; depois "Montar pedido" | Vai a `/pedidos` (idx 0); ao reabrir: "Rascunho retomado: as peças e os descontos voltaram. A cliente e o motivo do desconto não ficam guardados — escolha e escreva de novo." | `screenshots/CH-04-r2-04-rascunho-retomado.png` |
| 08 | Escolhe a mesma cliente sem nome cadastrado, avança aos 4 passos e toca "Criar link" | Fica no Revisar com "Informe o nome da cliente."; console: `POST …/functions/v1/order-proposals?action=save → 400` | `screenshots/CH-04-r2-05-criar-link-sem-nome.png` |
| 09 | "Alterar" na cliente, troca para uma cliente com nome, avança e "Criar link" | "Alterar" leva ao passo 1 recuando o histórico (idx 2, sem empilhar); link criado: `/pedidos/montados/<id>` "Pedido montado P-0040 · Link criado."; `history.length` 3, idx 1; rascunho apagado do aparelho | — |
| 10 | Voltar | `/pedidos?visao=montados`, com o cartão P-0040; nenhum passo da montagem | `screenshots/CH-04-r2-06-voltar-montados.png` |
| 11 | Voltar de novo | Sai do app (`about:blank`, o começo da aba) sem passar por passo nenhum da montagem | — |
| 12 | Avançar duas vezes | Montados, depois o pedido montado P-0040; a montagem nunca reabre | — |
| 13 | Sai da conta e fecha o browser | Sessão limpa do armazenamento (o menu da conta não foi achado em `/conta`; a sessão foi limpa do `localStorage`); browser fechado | — |

**Edge cases tentados:** voltar com a folha de sair aberta, só com a cliente e com peças; voltar repetido no passo 1 (a folha alterna, nunca sai); voltar com a folha da variação aberta (entorno); "Guardar rascunho" e retomada; "Alterar" do Revisar; `history.forward` depois de voltar a Montados.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-003 | pass | 09–12 | `screenshots/CH-04-r2-06-voltar-montados.png` | BUG-001 confirmado corrigido também partindo de um rascunho retomado: voltar → Montados com o cartão; segundo voltar sai; avançar não reabre a montagem |
| TC-FUNC-004 | pass | 02–07 | `screenshots/CH-04-r2-01-folha-sair-so-cliente.png`, `CH-04-r2-02-folha-sair-com-pecas.png`, `CH-04-r2-03-voltar-fecha-folha.png` | BUG-007 corrigido: voltar com a folha aberta fecha a folha e mantém a montagem (2 de 2: só cliente; com peça). "Guardar rascunho" e a retomada seguem certos |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada (nenhuma regressão nem novo critical/high).

Sugestão de backlog (não é achado desta rodada, fora da superfície das correções): a cliente cadastrada sem nome (só e-mail) pode ser escolhida no passo 1 e a recusa só aparece no "Criar link", no passo 4, com "Informe o nome da cliente." e `order-proposals?action=save → 400`. Contorno: "Alterar" e outra cliente. Passo 08, `screenshots/CH-04-r2-05-criar-link-sem-nome.png`.

## Spec-gaps

nada

## Fora da cobertura

- Os demais TC do charter (TC-JOURNEY-003, TC-FUNC-005, TC-SEC-002, TC-REG-001) — rodada de confirmação, só os TC das correções
- O gesto físico de voltar e o PWA instalado no Android real — fora do alcance do browser da sessão
- Folha de sair com "Cliente nova" digitada — não refeito; a correção é a mesma folha e o mesmo voltar
- Sair pelo menu da conta — o controle não foi achado em `/conta` no orçamento; a sessão foi limpa do armazenamento antes de fechar

## Debrief

- **Surpresas:** as folhas agora são entradas do histórico (`folhaDaTela`), e o voltar no passo 1 alterna a folha de sair; para sair é preciso tocar "Sair"/"Guardar rascunho"/"Descartar" — coerente com D-12/D-18
- **Próximo charter:** nada
- **Padrão novo:** nada
