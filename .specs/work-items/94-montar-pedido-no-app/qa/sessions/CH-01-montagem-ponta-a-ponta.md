# Sessão CH-01 · A montagem de ponta a ponta no celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-montagem-ponta-a-ponta.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri no WhatsApp · conta: `admin-atelie` (arquivo local de credenciais; `QA_*` não existe nesta máquina) |
| Tour · modo | Feature · por cenário (só J-02, rodada de confirmação)                 |
| Rodada      | confirmação                                                            |
| Orçamento   | 34 ações de browser de 35                                              |
| Ambiente    | `http://localhost:8084` · build `feature/94` @ `e8b20c6c` (informado; não exposto na tela) · Chromium headless (Playwright MCP) · viewport 390 × 844 |
| Paridade    | Supabase local; `*.supabase.co` bloqueado por rota; cotação do Melhor Envio servida localmente; dado sintético (cliente "Marta Lúcia QA Oitenta e Nove", peças "QA Pingente …") |

## Missão

Confirmar que a Adri, só com o celular, monta um pedido para uma cliente nova (digitando) e outro para uma
cliente cadastrada, do toque em "Montar pedido" ao pedido montado com o link, sem parar sem saber por quê —
e que a ficha e o endereço só existem depois de "Criar link".

Nesta rodada (confirmação): só os TC que falharam na rodada 1 e o entorno imediato das correções dos
BUG-001, BUG-002, BUG-005, BUG-006 e BUG-008.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no ateliê e tocar em "Montar pedido" | Login; "Montar pedido · Passo 1 de 4 · Cliente"; barra "Escolha a cliente para continuar.", "Nenhuma peça ainda", "—", "Continuar" desligado | — |
| 02 | Buscar "marta" e escolher a cliente | Cartão "Cliente" com "Trocar": nome, "3 pedidos na loja", `marta.qa89@exemplo.invalid`, "(51) 98888-7777"; "Entrega" em "Endereço padrão" (Rua Siqueira Campos, 1240 — Porto Alegre/RS · 90010000); "Continuar" ligado | `screenshots/CH-01-r2-01-cartao-cliente.png` |
| 03 | Buscar "qa pingente", abrir "QA Pingente Lua" e tocar duas vezes rápido em "Acrescentar · R$ 219,90" | "Sacola · 1 peça", uma linha só; barra "Itens · 1 peça · frete à parte" com "R$ 219,90" | `screenshots/CH-01-r2-02-duplo-toque-sacola.png` |
| 04 | Repetir o duplo toque noutra peça ("QA Pingente Estrela Guia…", R$ 269,90) | "Sacola · 2 peças", uma linha de cada; barra "Itens · 2 peças · frete à parte" com "R$ 489,80" | `screenshots/CH-01-r2-03-duplo-toque-segunda.png` |
| 05 | Seguir pelo passo 3 (Descontos, sem desconto) até "Revisar" | Revisão: Sacola com as duas peças, Total R$ 489,80, "No PIX: R$ 455,51…"; Cliente com telefone; Entrega com "SEDEX · 1 a 2 dias úteis · R$ 18,21" **e** "Retirada no escritório · Escritório - Uma Estrelinha - Rua Jandyr Maya Faillace, Jardim Leopoldina, Porto Alegre/RS · grátis"; "Prévia. A cliente escolhe a entrega no link."; a nota dos 7 dias "até 15/11" | `screenshots/CH-01-r2-04-revisar-entrega.png` |
| 06 | Tocar em "Criar link" | Pedido montado P-0038, "Link criado." / "Agora é só mandar para Marta.", link e mensagem do WhatsApp | `screenshots/CH-01-r2-05-link-criado.png` |
| 07 | Voltar uma vez (`history.back`) | `/pedidos?visao=montados`, chip "Montados · 6 abertos", P-0038 no topo, "Montado há 1 min", R$ 489,80 (igual ao Total da revisão) | `screenshots/CH-01-r2-06-voltar-montados.png` |
| 08 | Voltar mais uma vez | Saiu do app (a aba foi à página em branco de onde a sessão começou); nenhum passo da montagem reabriu | — (a screenshot não saiu: a página em branco não tem `main`) |
| 09 | Avançar, e avançar de novo | 1.º avançar: Montados com P-0038; 2.º avançar: o pedido montado P-0038. A montagem não aparece em nenhum ponto | `screenshots/CH-01-r2-08-avancar.png` |
| 10 | Segunda rodada da saída: nova montagem para Marta (uma peça), "Criar link" (P-0039), voltar, voltar | 1.º voltar: Montados com P-0039 no topo ("Montados · 7 abertos"); 2.º voltar: o pedido montado P-0038 (entrada anterior do histórico), não a montagem. O cartão "Cliente" desta rodada repetiu nome, "3 pedidos na loja", e-mail e telefone | `screenshots/CH-01-r2-09-voltar-montados-2.png` · `screenshots/CH-01-r2-01-cartao-cliente.png` |
| 11 | Sair da conta | O app não mostrou "Sair" em `/pedidos` nem em `/` pelo caminho tentado; a sessão foi encerrada limpando o armazenamento e os cookies do contexto — `/pedidos` voltou a `/login` | — |

**Edge cases tentados:** duplo toque em "Acrescentar" (2 peças diferentes); voltar e avançar depois de "Criar link" (2 rodadas).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-006 | pass | 02, 10 | `screenshots/CH-01-r2-01-cartao-cliente.png` | BUG-006 corrigido: "3 pedidos na loja", e-mail e telefone no cartão (2 de 2). Só o passo 4 do TC foi reconferido |
| TC-FUNC-017 | pass | 03, 04 | `screenshots/CH-01-r2-02-duplo-toque-sacola.png` · `screenshots/CH-01-r2-03-duplo-toque-segunda.png` | BUG-002 corrigido: uma linha só por duplo toque, 2 de 2. Só a variação do duplo toque foi reconferida |
| TC-FUNC-002 | pass | 01, 03, 04 | `screenshots/CH-01-r2-02-duplo-toque-sacola.png` | BUG-005 corrigido: "Itens · N peças · frete à parte" com o total (R$ 219,90; R$ 489,80); sem peças, "—". Só os passos 1 e 7 do TC foram reconferidos |
| TC-FUNC-024 | pass | 05 | `screenshots/CH-01-r2-04-revisar-entrega.png` | BUG-008 corrigido: "Retirada no escritório · grátis" ao lado do SEDEX para CEP 90010000. Sem PAC — a cotação local devolve só SEDEX (ambiente, como na rodada 1) |
| TC-FUNC-025 | pass | 06–10 | `screenshots/CH-01-r2-06-voltar-montados.png` · `screenshots/CH-01-r2-09-voltar-montados-2.png` | BUG-001 corrigido: o voltar leva a `/pedidos?visao=montados` com o cartão novo; o segundo voltar e o avançar não reabrem a montagem (2 de 2). Duplo toque em "Criar link" não reconferido (passava na r1) |
| TC-JOURNEY-002 | pass | 02–07 | `screenshots/CH-01-r2-05-link-criado.png` · `screenshots/CH-01-r2-06-voltar-montados.png` | Total do pedido montado = Total da revisão (R$ 489,80); cartão novo em Montados. Desconto combinado, troca de endereço e gravação não refeitos (passavam na r1; fora do recorte da confirmação) |
| TC-PERSONA-001 | pass | 01–07 | — | J-02 só com toque, sem passo parado sem saber o que fazer; a falha da r1 (voltar) não se repete |

Contagem: pass 7 · fail 0 · blocked 0 · skip 0

## Achados

nada

<!-- Sugestão de backlog (não é regressão nem critical/high): depois de "Criar link", a entrada do histórico
que era `/pedidos` (Precisa de ação) foi substituída pela de Montados; o segundo voltar sai do app (no teste,
para a página em branco inicial; no celular, fecharia o app instalado). A D-43 pede só que a montagem não volte,
e isso vale. Fica para a triagem decidir se o segundo voltar deveria cair em Pedidos. Passo 08. -->

## Spec-gaps

nada

## Fora da cobertura

- Cliente nova (J-01), ficha e endereço gravados só depois de "Criar link", conferência no painel — fora do recorte da confirmação (os TC respectivos passaram na r1)
- Desconto combinado, troca para o outro endereço salvo e gravação da TC-JOURNEY-002 — passavam na r1; não refeitos para caber no orçamento
- Duplo toque em "Criar link" (TC-FUNC-025 passo 1) — passava na r1
- Screenshot do segundo voltar da 1.ª rodada — a página de destino era a em branco inicial da aba
- "Sair" pela tela: não encontrado nos dois caminhos tentados dentro do orçamento; a sessão foi encerrada limpando o armazenamento do contexto. Não registrado como achado (fora da superfície da Mudança e não investigado)
- Massa criada nesta rodada: pedidos montados P-0038 e P-0039 para a Marta (abertos)

## Debrief

- **Surpresas:** o histórico depois de "Criar link" encolhe (7 → 3 entradas): a montagem e a entrada de Pedidos saem; o segundo voltar deixa o app
- **Próximo charter:** nada
- **Padrão novo:** nada
