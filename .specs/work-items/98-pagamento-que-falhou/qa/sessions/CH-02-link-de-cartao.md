# Sessão CH-02 · Pagar pelo link de cartão — ou não conseguir pagar o que não se deve

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-link-de-cartao.md` · exploratório · P0     |
| Status      | done                                                                   |
| Persona     | PER-04 Cliente que recebeu o link pelo WhatsApp · conta: anonima (e `cliente` — `QA_CLIENTE_*` — só na variação "sessão de outra conta") |
| Tour · modo | Money · com tour                                                       |
| Rodada      | exploração                                                             |
| Orçamento   | ~46 ações de browser de 50                                             |
| Ambiente    | http://localhost:8082 · build não exposto (Vite dev) · Chromium headless (Playwright MCP) · viewports 390×844, 320×568, 1280×720 (segunda aba) |
| Paridade    | Supabase local; `*.supabase.co` e `**/g/collect*` bloqueados; massa sintética M14/M15; tamanho de fonte simulado pelo `font-size` da raiz (não pela fonte do sistema). O Brick do Mercado Pago **carregou** (a loja local serve uma chave pública `APP_USR-…`, de produção) — por isso nenhum cartão foi digitado nem enviado |

## Missão

Achar qualquer jeito de, pelo link do WhatsApp, pagar o pedido errado, pagar outro valor, pagar duas
vezes, ou pagar um pedido que já não aceita pagamento — e confirmar que o link vivo leva a cliente sem
conta ao pagamento do pedido certo.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir o link vivo (#0578), sem sessão, em 390 | Sem pedido de login. "Pagamento com cartão · Pedido #0578", "Pingente Pata Coleção Fragmentos × 2", "Total no cartão R$ 65,80", formulário do Brick e "Pagar R$ 65,80 no cartão". Após carregar, a barra mostra `/pagar-com-cartao` sem o `#…`. `scrollWidth` 390. Nenhum e-mail, telefone, CPF ou endereço na tela; a resposta de `get-card-link` traz só id, número, valor e itens | `screenshots/CH-02-01-link-vivo.png` |
| 02 | Tocar "Pagar R$ 65,80 no cartão" sem preencher | O Brick marca os seis campos com "Dado obrigatório"; nenhuma chamada de cobrança saiu (console: `incomplete_fields`) | — |
| 03 | Abrir o link antigo de #0579 (substituído) | "Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo." + "Falar no WhatsApp"; sem formulário | `screenshots/CH-02-03-link-substituido.png` |
| 04 | Abrir o link novo de #0579 (troca só do fragmento, mesma aba) | Pedido #0579, Trevo × 2, R$ 46,80, formulário — a tela acompanhou a troca do fragmento | — |
| 05 | Abrir o link de #0580 (pago) | Após "Carregando o pagamento...": "O pedido #0580 já foi pago. Não há nada a pagar por este link." Sem formulário e **sem nenhuma saída** (só o logotipo) | `screenshots/CH-02-05-pedido-pago.png` |
| 06 | Abrir o link de #0581 (cancelado) | "O pedido #0581 foi cancelado. Não há nada a pagar por este link." + "Falar no WhatsApp"; sem formulário | `screenshots/CH-02-06-pedido-cancelado.png` |
| 07 | Trocar o último caractere do código vivo | Mesma frase do link substituído, sem nenhum dado de pedido | — |
| 08 | Abrir `/pagar-com-cartao` sem fragmento, em aba sem link anterior | Mesma frase, com "Falar no WhatsApp" | — |
| 09 | Abrir o link vivo e recarregar (F5) depois de o código sair da barra | Volta ao mesmo pedido #0578, R$ 65,80, com o formulário | — |
| 10 | Abrir o mesmo link numa segunda aba e recarregar a primeira | As duas mostram #0578, R$ 65,80 | — |
| 11 | Na segunda aba (1280×720) e na primeira (390) comparar o cabeçalho | Em 1280 o cabeçalho tem "Ajuda no WhatsApp"; em 390 só "Ambiente seguro" — no formulário vivo, em 390, não há caminho para falar com a loja | — |
| 12 | 320×568 com fonte da raiz a 200 % no link vivo | Rolagem lateral: `scrollWidth` 371 numa viewport de 320; quem passa da borda é o bloco "Ambiente seguro" do cabeçalho (direita em 356). A 130 % e em 390 a 200 %, sem rolagem | `screenshots/CH-02-12-320-fonte-200.png` |
| 13 | Voltar (botão do navegador) depois da tela de cancelado, e avançar | Volta à home; avançar reabre "O pedido #0581 foi cancelado…" | — |
| 14 | 12 códigos inventados seguidos, depois o vivo | Os 12 com a frase de link indisponível; o vivo continua abrindo | — |
| 15 | Abrir o link de M15a (#0583, promoção e cupom encerrados) | "Pingente Pata × 3", "Total no cartão R$ 76,83" — o valor travado da primeira cobrança (recalculado hoje seria R$ 88,70); nenhuma recusa de "o valor mudou" | `screenshots/CH-02-15-m15-valor-travado.png` |
| 16 | Entrar como `cliente` (outra conta) e abrir o link vivo | Pedido #0578, R$ 65,80; nenhum dado da conta aberta na tela; o e-mail do Brick vem vazio | — |
| 17 | Abrir o link vivo com a chamada de `checkout` caindo (rede) | Em ~1,5 s: alerta "Não consegui abrir o pagamento agora. Tente de novo." + "Tentar de novo"; com a rede de volta, o botão reabre o #0578 | `screenshots/CH-02-20-falha-de-rede.png` (capturada ainda no "Carregando…", instantes antes do alerta) |
| 18 | Sair da conta `cliente` | Sessão encerrada (sem chave de auth no armazenamento) | — |

**Edge cases tentados:** deep link sem fragmento (08); mesma URL em duas abas (10); voltar depois da tela de situação (13); recarregar com o código fora da barra (09); link interno para deslogado (01); link com sessão de `cliente` de outra conta (16); viewport 320×568 (12); fonte a 200 % (12); troca só do fragmento na mesma aba (04); código adulterado (07) e rajada de códigos inventados (14); falha de rede na abertura (17); "Pagar" com o Brick vazio (02).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-002 | blocked | 01, 02, 09, 16 | `screenshots/CH-02-01-link-vivo.png` | Passos 1–2 e as duas variações passam (sem login, código fora da barra, #0578 e R$ 65,80, recarregar volta à mesma tela, sessão de outra conta não mistura). Passos 3–4 bloqueados: o Brick carrega com chave pública de produção e o servidor local tem chaves inválidas — não se digitou cartão |
| TC-FUNC-016 | pass | 03, 04 | `screenshots/CH-02-03-link-substituido.png` | Variação "antigo aberto antes" não exercitada: exige gerar um link novo com a aba antiga aberta (CH-05/thread) |
| TC-FUNC-017 | pass | 05, 06 | `screenshots/CH-02-05-pedido-pago.png` · `CH-02-06-pedido-cancelado.png` | Variação "cancelado com a tela aberta" não exercitada (exige a thread cancelar). Ver spec-gap: a tela de pago não tem saída |
| TC-SEC-002 | pass | 01, 07, 08, 14 | — | Variação "muitas tentativas" feita com 12 (não 30); nenhum dado e nenhuma recusa por excesso |
| TC-SEC-003 | pass | 05, 06 | `screenshots/CH-02-05-pedido-pago.png` | Parte de tela: com pedido pago ou cancelado não há formulário nem chamada de cobrança. A recusa do servidor (passo 2) e a variação com a tela aberta ficam com o probe 06 / a thread |
| TC-INT-005 | blocked | 02 | — | Cobrança real do Mercado Pago indisponível no local (chaves inválidas no servidor); chave pública de produção no Brick — não se enviou cartão |
| TC-INT-006 | pass | 15 | `screenshots/CH-02-15-m15-valor-travado.png` | Só o passo 1 (valor exibido R$ 76,83). Passos 2–4 (valor cobrado pela function, pedido montado, gravado fora da loja) são da thread/probe 07 e de outra tela |

Contagem: pass 5 · fail 0 · blocked 2 · skip 0

## Achados

### A-1 · [Pagamento por link, 320 px com fonte grande] O cabeçalho "Ambiente seguro" faz a página rolar de lado — para a cliente com fonte aumentada em celular pequeno

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-04 Cliente que recebeu o link pelo WhatsApp                       |
| Jornada e passo     | J-04, passo 1 (abre o link) · passo 12 do log                         |
| TC                  | —                                                                     |
| Gravidade proposta  | low — a página inteira desliza de lado ao rolar, mas o pedido, o valor e o formulário continuam alcançáveis |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 320 × 568, fonte da raiz a 200 %                                      |

**Passos para reproduzir** — de um estado limpo:

1. Sem sessão, viewport 320 × 568, abrir `http://localhost:8082/pagar-com-cartao#<código vivo de M14>` (#0578)
2. Esperar "Total no cartão" e aumentar a fonte para 200 % (no teste: `font-size: 200%` na raiz)
3. Medir a largura do documento

**Esperado:** nenhuma rolagem horizontal do body — **fonte:** CLAUDE.md, convenção "Mobile é o caso principal" (scroll horizontal do body nunca deve existir); charter CH-02, edge case "Viewport mínima 320 × 568" e "Fonte do sistema a 200 %"

**Observado:** `scrollWidth` 371 numa viewport de 320; o bloco "Ambiente seguro" do cabeçalho termina em x=356. Em 320 a 100 %/130 % e em 390 a 200 %, sem rolagem.

**Evidência:**

- `screenshots/CH-02-12-320-fonte-200.png` — o cabeçalho passando da borda
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A tela de pedido já pago ("O pedido #0580 já foi pago. Não há nada a pagar por este link.") não oferece saída nenhuma — nem "Falar no WhatsApp" (que as telas de cancelado e de link indisponível têm) nem caminho para ver o pedido; só o logotipo | 05 | polimento |
| No formulário vivo em 390 o cabeçalho não tem "Ajuda no WhatsApp" (aparece só a partir de largura maior); a cliente desconfiada, no meio do pagamento, não tem como falar com a loja sem sair da tela | 11 | pré-existente |
| As telas de situação (pago, cancelado, link indisponível) mantêm o título "Pagamento com cartão" acima de uma frase que diz que não há nada a pagar | 05, 06 | polimento |

## Fora da cobertura

- Preencher e pagar no Brick (sucesso, recusa, espera, recarregar durante a espera, voltar depois do sucesso) — o Brick carrega com chave pública de produção no local e o servidor tem chaves inválidas; não se digitou cartão para não arriscar cobrança real
- TC-FUNC-016 variação "antigo aberto antes" e TC-FUNC-017/TC-SEC-003 variação "cancelado com a tela aberta" — exigem a thread gerar link novo ou cancelar o pedido durante a sessão; não alteramos dado da massa
- TC-SEC-003 passo 2 e TC-INT-006 passos 2–4 — chamada direta à function, fora do browser (probes 06/07 da Validation)
- Rede lenta (throttling) — o browser da sessão não tem; só a queda total da chamada foi simulada (passo 17)
- Fonte do sistema real (Android) — simulada pelo `font-size` da raiz
- Rajada de 30 códigos — feita com 12

## Debrief

- **Surpresas:** o Brick do Mercado Pago carregou no local, com uma chave pública `APP_USR-…` (de produção), ao contrário do que o briefing previa; isso mudou o passo 4 de "não carrega" para "carrega, mas não se paga". A troca só do fragmento na mesma aba recarrega o pedido certo (passo 04)
- **Próximo charter:** a variação "tela aberta enquanto a Adri gera link novo / cancela" casada com o CH-05 (gerar o link no painel), com o browser da cliente aberto em paralelo
- **Padrão novo:** trocar só o `#fragmento` na mesma aba (navegação no mesmo documento) — candidato ao tour de links mágicos
