# Sessão CH-06 · O pedido montado com entrega fora da região (continuação 2)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-pedido-montado-fora-da-regiao.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Cida · conta: anonima (o link do pedido montado, `QA_PEDIDO_MONTADO_LINK`; contato preenchido pelo link com o e-mail de `cliente-salvador`) |
| Tour · modo | Money · por cenário (J-04)                                             |
| Rodada      | exploração                                                             |
| Orçamento   | 30 ações de browser de 30                                              |
| Ambiente    | http://localhost:8082 · build não exposto · chromium (playwright-cli, headless, perfil em memória) · viewport 390 × 844 |
| Paridade    | cotação interceptada (fixture A, com CORS); `*.supabase.co` e `**/g/collect*` bloqueados; Mercado Pago com chave inválida; sem login (o link basta) |

## Missão

Como Cida, pagando pelo link que a Adri mandou, procurar qualquer caminho em que o pedido montado conceda o frete
grátis para Salvador — na tela ou no pedido que nasce — ou em que ele mexa na sacola que ela tinha montado.

Foco desta continuação (briefing): TC-INT-001 passo 1 completo e passo 3.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu o link do pedido montado, sem conta, a 390 × 844 | "Seu pedido — Montado pela Adri para você", link vale até 21/11/2026; 1 peça R$ 490,00; Resumo: Frete "a calcular", Desconto PIX −R$ 34,30, Total R$ 455,70; contato já com nome Marina Salvador e o e-mail da conta (travado); WhatsApp vazio | — |
| 02 | Aceitou os cookies, informou o WhatsApp 71988887777 e tocou "Continuar" | Abriu "Entrega" com CEP vazio (Rua, Bairro, Cidade, UF desabilitados) | — |
| 03 | Informou 01310-100 e o número 100 | Busca preencheu Avenida Paulista, Bela Vista, São Paulo, SP; opções: PAC "Grátis" (R$ 21,40 riscado) e SEDEX R$ 38,90 | — |
| 04 | Escolheu o PAC | Resumo: "Frete · Correios PAC — Grátis", Total R$ 455,70 (sem frete) | `screenshots/CH-06d-01-sp-pac-gratis.png` |
| 05 | Trocou o CEP para 40020-000 | Status "Não localizamos esse CEP. Preencha o endereço à mão — a cotação segue pelo CEP informado."; campos liberados com o endereço de SP ainda neles; PAC agora R$ 21,40 sem "Grátis", e a escolha anterior foi desmarcada (Frete volta a "a calcular", Total R$ 455,70) | — |
| 06 | Preencheu à mão Rua Chile, Centro, Salvador, BA (número 100 mantido) e escolheu o PAC | Resumo: "Frete · Correios PAC — R$ 21,40"; botão "Pagar R$ 477,10 com PIX" (desabilitado até concluir a etapa) | `screenshots/CH-06d-02-salvador-pac-cobrado.png` |
| 07 | Tocou "Continuar" da Entrega | Etapa "Pagamento": PIX −7% marcado; campo "CPF ou CNPJ do pagador" obrigatório; "Pagar R$ 477,10 com PIX" segue desabilitado; Frete do resumo R$ 21,40 | `screenshots/CH-06d-03-pagamento-cpf.png` |

**Edge cases tentados:** trocar de um CEP da região (com o PAC grátis marcado) para um fora — a escolha é desfeita e o frete volta cobrado (passo 05)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-INT-001 | skip | 04 · 06 · 07 | `screenshots/CH-06d-01-sp-pac-gratis.png` · `screenshots/CH-06d-02-salvador-pac-cobrado.png` · `screenshots/CH-06d-03-pagamento-cpf.png` | passo 1 passou (PAC escolhido "Grátis", Total R$ 455,70 sem frete); passo 2 passou (PAC R$ 21,40, Total R$ 477,10); passo 3 não alcançado: depois do "Continuar" a etapa de pagamento exige CPF/CNPJ do pagador antes do "Pagar", e o orçamento (30) acabou — nenhum pedido nasceu |

Contagem: pass 0 · fail 0 · blocked 0 · skip 1

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-INT-001 passo 3 (o Total do pedido que nasce na tela de pagamento e em `/conta`) — orçamento: 30 de 30. Faltam
  2 ações: preencher "CPF ou CNPJ do pagador" e tocar "Pagar R$ 477,10 com PIX", e uma leitura. O CPF não está na
  massa do briefing: a próxima sessão precisa de um CPF sintético válido declarado (ex.: na massa)
- Caso CEP 40020-000 com UF SP herdada (não corrigir a UF) — orçamento. Observação parcial: no passo 05, com o
  endereço de SP ainda nos campos e o CEP 40020-000, o PAC já veio cobrado (R$ 21,40) antes de corrigir a UF; o
  Total do pedido nesse caso não foi visto
- TC-FUNC-017 e os edge cases do charter (recarregar, voltar, duplo toque em pagar, segunda aba) — fora do foco
  desta continuação
- O "Sair" da conta — não houve login; a sessão foi encerrada fechando o browser (perfil em memória)
- Massa: P-0046 **não consumido**; nenhum pedido `pending` criado

## Debrief

- **Surpresas:** a etapa "Pagamento" pede "CPF ou CNPJ do pagador" antes de liberar o "Pagar" — não estava no
  roteiro. Ao trocar o CEP de SP para Salvador, a opção marcada (PAC grátis) é desmarcada, e a região é decidida
  pelo CEP mesmo com Cidade/UF de SP nos campos
- **Próximo charter:** quarta sessão curta do CH-06 a partir do link: telefone → CEP 40020-000 + endereço → PAC →
  "Continuar" → CPF sintético → "Pagar com PIX" → Total na tela; ~22 ações bastam com o roteiro desta sessão
- **Padrão novo:** nada
