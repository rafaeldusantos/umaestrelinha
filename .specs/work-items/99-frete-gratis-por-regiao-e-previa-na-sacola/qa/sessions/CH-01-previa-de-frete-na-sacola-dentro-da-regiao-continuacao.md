# Sessão CH-01 · A prévia de frete na sacola, dentro da região da campanha (continuação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-previa-de-frete-na-sacola-dentro-da-regiao.md` · exploratório · P0 |
| Status      | done (orçamento esgotado no checkout de SP: RS e 1440 × 900 ficaram de fora) |
| Persona     | PER-01 Luana · conta: anonima |
| Tour · modo | Feature · por cenário (J-01), mas rodada de confirmação: sem tour |
| Rodada      | confirmação (rodada 2, continuação de `sessions/CH-01-previa-de-frete-na-sacola-dentro-da-regiao.md`) |
| Orçamento   | 30 ações de browser de 30 |
| Ambiente    | http://localhost:8092 (worktree store__feature-99) · build não exposto · Chromium headless (`playwright-cli -s=CH-01b`) · viewport 390 × 844 (1440 × 900 não alcançado) |
| Paridade    | cotação interceptada com a fixture A (200 + CORS); `https://*.supabase.co/**` e `**/g/collect*` abortados; frete grátis ligado, R$ 450,00, Sul + Sudeste (não alterado) |

## Missão

Como Luana, no celular, confirmar que dá para saber o frete de São Paulo e se o frete grátis vale para ela ainda na
sacola, e chegar ao checkout com o mesmo Total e sem digitar o CEP de novo, procurando qualquer promessa da gaveta
que o checkout desmente.

Nesta continuação: fechar o A-1 da sessão anterior (a peça entra ou não na sacola) e conferir o TC-FUNC-006 (SP e RS
acima de R$ 450, gaveta × checkout, 390 e 1440).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Preparar: abrir o browser, 390 × 844, rota da cotação (fixture A + CORS), bloqueio do Storage hospedado e do GA4 (4 ações) | `route-list` com a rota da cotação | — |
| 02 | Procurar uma peça pela Home e por /busca | Home e /busca sem vitrine no snapshot (a busca sem termo não lista peças); seguiu pela categoria "Joias afetivas" | — |
| 03 | Abrir "Joias afetivas" | lista de peças de R$ 179,90 a R$ 279,90; escolhida "Pingente Afetivo Bebê na Barriga com Cabelo" a R$ 279,90 (2 unidades passam de R$ 450) | — |
| 04 | Abrir a peça e aceitar os cookies | "R$ 279,90", "Folheado a ouro (Prata 925)" marcado, "Em estoque", "Frete grátis acima de R$ 450,00 · para Sul e Sudeste"; o único "Adicionar à sacola" está na barra de compra do fim da página | — |
| 05 | Tocar "Adicionar à sacola" com a página no topo (snapshot fresco) | o driver **não executou** o clique: `Timeout 5000ms exceeded … element is outside of the viewport` (o botão resolveu, visível e habilitado, mas fora da viewport mesmo depois do scroll automático) | — |
| 06 | Rolar a página (700 px) e tocar "Adicionar à sacola" de novo | clique executado (`getByRole('button', { name: 'Adicionar à sacola' }).click()`, sem erro); a gaveta "Sua sacola" abriu com a peça, R$ 279,90, quantidade 1, "Faltam R$ 170,10 para o frete grátis", barra de progresso, campo de CEP. **A-1 fechado: a peça entra** | — |
| 07 | Aumentar a quantidade para 2, digitar 01310-100 e tocar "Calcular" | faixa em `status`: "Frete grátis liberado" com o botão "Sobre o frete grátis" (ⓘ), **sem** a barra de progresso; "Frete para 01310-100 · São Paulo/SP" e "Trocar CEP"; PAC · Correios marcado, "Grátis" com "R$ 21,40" ao lado; SEDEX · Correios R$ 38,90; Subtotal (2 itens) R$ 559,80; "Frete · PAC" Grátis; **Total R$ 559,80** | `screenshots/CH-01-r2b-03-gaveta-sp-liberado-390.png` |
| 08 | Tocar no ⓘ | balão (`tooltip`): "Entrega em São Paulo/SP, região Sudeste. A forma de envio mais barata sai sem custo." | `screenshots/CH-01-r2b-03-gaveta-sp-liberado-390.png` |
| 09 | Tocar "Finalizar Pedido" | /checkout: botão do resumo "Resumo · 2 itens · frete grátis R$ 520,61"; passo 1 Contato aberto; passo 2 Entrega recolhido com "Informe seu CEP e escolha o envio" e "Preencher"; "Pagar R$ 520,61 com PIX" desabilitado. Orçamento esgotado aqui (screenshot de página inteira foi a 30ª ação) | `screenshots/CH-01-r2b-04-checkout-sp-390.png` |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-006 | blocked | 06–09 | `screenshots/CH-01-r2b-03-gaveta-sp-liberado-390.png` · `screenshots/CH-01-r2b-04-checkout-sp-390.png` | bloqueado por orçamento. Passos 1 e 2 em SP/390 conferem (liberado, PAC Grátis com R$ 21,40 ao lado, SEDEX cobrado, "Frete · PAC" Grátis, Total R$ 559,80 = subtotal, ⓘ com a região). Passo 3 só em parte: o checkout leva o "frete grátis" ao resumo, mas o bloco Entrega não foi aberto (opção, valor riscado e CEP não conferidos) e o resumo mostra R$ 520,61, preço no PIX (a peça custa R$ 260,31 no Pix), enquanto a gaveta mostra R$ 559,80; a comparação do Total na mesma forma de pagamento não foi feita. O risco do valor ficou só no print. Passo 4 (RS) e a variação 1440 × 900 não rodaram |

Contagem: pass 0 · fail 0 · blocked 1 · skip 0

## Achados

nada

O A-1 da sessão anterior ("Adicionar à sacola" não põe a peça na sacola) **fica fechado como problema de
condução, não de produto**: com a página no topo em 390 × 844, o `click` do driver falha com "element is outside of
the viewport" e não chega ao botão (passo 05). Com a página rolada, o mesmo botão põe a peça na sacola e abre a gaveta
(passo 06). Não abrir bug a partir do A-1.

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- TC-FUNC-006 passo 3 completo: abrir o passo Entrega do checkout e conferir CEP 01310-100 trazido, PAC "Grátis" com o valor riscado e o mesmo Total da gaveta na mesma forma de pagamento. Motivo: orçamento (30 de 30). O resumo recolhido diz "frete grátis R$ 520,61" (preço PIX), e a gaveta diz Total R$ 559,80. Falta ver o Resumo aberto ou o Total no cartão para saber se é a mesma conta
- TC-FUNC-006 passo 4 (90010-000, Porto Alegre/RS, região Sul): orçamento
- Variação 1440 × 900 (gaveta × checkout): orçamento
- O valor "R$ 21,40" do PAC está ao lado de "Grátis" no snapshot; se ele aparece riscado só o print mostra (o snapshot não mostra estilo). Não li a imagem de volta
- 6 ações gastas para achar uma peça (a Home e /busca sem vitrine no snapshot), mais 1 no clique recusado pela viewport

## Debrief

- **Surpresas:** o `click` do `playwright-cli` no "Adicionar à sacola" da barra de compra falha com a página no topo ("outside of the viewport") mesmo com o scroll automático; rolar antes resolve. Explica o A-1 da sessão anterior. O resumo do checkout abre com o preço PIX (R$ 520,61) e a gaveta com o preço cheio (R$ 559,80)
- **Próximo charter:** reteste curto (cerca de 15 ações): entrar direto em `/produtos/pingente-afetivo-bebe-na-barriga-com-cabelo`, rolar, adicionar, quantidade 2, calcular 90010-000, ⓘ, "Finalizar Pedido", abrir Entrega e Resumo e comparar o Total na mesma forma de pagamento; depois `resize 1440 900` e repetir a comparação
- **Padrão novo:** no `playwright-cli`, rolar (`mousewheel 0 700`) antes de clicar em botão de barra fixa no fim da página; entrar pela URL da categoria ou do produto, não pela Home
