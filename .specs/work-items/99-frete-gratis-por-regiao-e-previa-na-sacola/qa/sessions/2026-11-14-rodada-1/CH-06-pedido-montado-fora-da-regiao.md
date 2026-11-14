# Sessão CH-06 · O pedido montado com entrega fora da região

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-pedido-montado-fora-da-regiao.md` · exploratório · P0 |
| Status      | done (o orçamento acabou antes do pagamento; ver Fora da cobertura) |
| Persona     | PER-02 Cida · conta: `cliente-salvador` — `QA_CLIENTE_SALVADOR_USUARIO` |
| Tour · modo | Money · por cenário (J-04) |
| Rodada      | exploração |
| Orçamento   | 50 ações de browser de 50 |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (playwright-cli 0.1.24, headless, perfil em memória) · viewport 390 × 844 |
| Paridade    | cotação interceptada com a fixture A (com CORS); `https://*.supabase.co/**` e `**/g/collect*` abortados; Mercado Pago com chave inválida; login por código lido no Mailpit local |

## Missão

Como Cida, pagando pelo link que a Adri mandou, procurar qualquer caminho em que o pedido montado conceda o frete
grátis para Salvador — na tela ou no pedido que nasce — ou em que ele mexa na sacola que ela tinha montado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar na conta pelo código de 6 dígitos (e-mail no Mailpit) | "Olá, Marina"; em Pedidos, "Você ainda não fez nenhum pedido." | — |
| 02 | Abrir uma peça (Pingente Afetivo Dois Corações com Leite Materno, R$ 209,90) e tocar "Adicionar à sacola" com a página no topo | O toque não pegou: o único "Adicionar à sacola" da página (a barra fixa) estava fora da área visível; a sacola continuou vazia. Depois de rolar a página, o toque adicionou a peça | — |
| 03 | Montar a sacola: 1 peça e calcular 40020-000 na gaveta | Gaveta: "Faltam R$ 240,10 para o frete grátis" (R$ 209,90 / R$ 450,00), "Frete grátis só para Sul e Sudeste", "Frete para 40020-000", PAC R$ 21,40 marcado, SEDEX R$ 38,90, linha "Frete · PAC" | `screenshots/CH-06-01-sacola-40020.png` |
| 04 | Abrir o link do pedido montado (P-0046) | Primeiro "Carregando seu pedido..."; depois "Seu pedido · Montado pela Adri para você", validade 21/11/2026, Berloque Afetivo Coração Cravejado com Leite Materno em Prata 925 ×1, R$ 490,00. Resumo: Subtotal R$ 490,00 · Frete "a calcular" · Desconto PIX (7%) −R$ 34,30 · Total R$ 455,70. Contato Marina Salvador pré-preenchido. Entrega: **CEP vazio** (só o placeholder 00000-000), Rua/Bairro/Cidade/UF vazios, sem "Trazido da sua sacola"; "Informe o CEP para ver as opções de envio." | — |
| 05 | Digitar 01310-100 no CEP do pedido montado e, logo em seguida, trocar para 40020-000 | Com o CEP em 40020-000: as opções "PAC · Correios … R$ 21,40" e "SEDEX · Correios … R$ 38,90", nenhuma marcada e **nenhuma como "Grátis"**; Resumo ainda com Frete "a calcular" e Total R$ 455,70 (nenhuma opção escolhida); "Continuar" e "Pagar R$ 455,70 com PIX" desabilitados. Rua/Cidade/UF ainda vazios no momento da leitura | — |

O orçamento acabou no passo 05. O browser foi fechado (perfil em memória, nada em disco); a saída da conta foi o
fechamento da sessão, sem o "Sair" pela tela — não sobrou ação no orçamento.

**Edge cases tentados:** troca rápida de CEP dentro → fora da região sem esperar a primeira cotação (passo 05) — a
tela ficou com as opções cobradas para 40020-000, sem resto do 01310-100.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-INT-001 | skip | 05 | — | orçamento: o passo 1 (01310-100 com "Grátis") não foi lido na tela; do passo 2 só se viu que as opções para 40020-000 aparecem cobradas (PAC R$ 21,40), sem escolher a opção nem ver o Total somar; o passo 3 (o pedido que nasce) não foi alcançado |
| TC-FUNC-017 | skip | 03 · 04 | `screenshots/CH-06-01-sacola-40020.png` | orçamento: o passo 1 passou (formulário do pedido montado vazio, sem 40020-000 nem "Trazido da sua sacola"); os passos 2 e 3 (seguir ao pagamento; voltar à gaveta e ver peça, 40020-000 e PAC intactos) não foram alcançados |

Contagem: pass 0 · fail 0 · blocked 0 · skip 2

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-INT-001 passos 1 e 3 e o resto do passo 2 (o "Grátis" com 01310-100, o Total subindo depois de escolher o PAC para 40020-000, o Total do pedido que nasce na tela de pagamento e em `/conta`) — orçamento: 50 de 50 gastos. A maior parte foi para entrar na conta (código no Mailpit, numa aba nova) e para chegar à sacola com uma peça (passo 02)
- TC-FUNC-017 passos 2 e 3 (a gaveta intacta depois do pedido montado) e a variação de calcular outro CEP na gaveta com o pedido montado aberto noutra aba — orçamento
- Edge cases do charter: recarregar `/pedido-montado` no meio do preenchimento, voltar do navegador depois de seguir ao pagamento, duplo toque em pagar (um pedido só), segunda aba com a gaveta aberta — orçamento
- 1440 × 900 — orçamento
- Resposta lenta da cotação ("calculando") — fora do alcance do `route` usado
- Massa: o link P-0046 **não foi consumido**: nenhum pedido nasceu nesta sessão (não se tocou em "Pagar"); a próxima tentativa do CH-06 pode usar o mesmo link

## Debrief

- **Surpresas:** na página da peça, a 390 × 844 e no topo, o único "Adicionar à sacola" (barra fixa) estava fora da área visível e o toque não adicionou nada, sem nenhum retorno; depois de rolar, adicionou. Não se conferiu a imagem nem se reproduziu, e a página da peça não é superfície da Mudança — fica como pista, não como achado. No pedido montado, Rua/Cidade/UF ainda estavam vazios logo depois do CEP (a busca pública do endereço pode não ter respondido a tempo)
- **Próximo charter:** repetir o CH-06 com orçamento que cubra o login (~20 ações só para entrar e montar a sacola): começar direto do link do pedido montado depois da sacola montada, e ir até o pedido que nasce
- **Padrão novo:** nada
