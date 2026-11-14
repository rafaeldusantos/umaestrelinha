# CH-01 · A prévia de frete na sacola, dentro da região da campanha

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-01 Luana |
| Tour         | Feature |
| Modo         | por cenário (J-01) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | a gaveta ganha o CEP, as opções de frete, a linha recolhida e o Total com o frete (CA-01..CA-05; M-04, M-05); a faixa do frete grátis vira uma linha com ⓘ e destaque em ouro quando concedido (CA-14, CA-16; M-01..M-03); o checkout recebe o CEP, o endereço e a opção da sacola (CA-09) |
| Viewport     | 390 × 844 (alvo do projeto); a comparação gaveta × checkout do TC-FUNC-006 repete em 1440 × 900 |
| Massa        | só lê: `store_settings.shipping` (ligado, R$ 450, Sul + Sudeste — deixada pelo CH-05), o catálogo local; cria e descarta a própria sacola e o rascunho do checkout (`sessionStorage` desta sessão) |
| Driver       | — |
| Entrada      | `/` (loja, `http://localhost:8082`) · anônima, sacola vazia, aba nova; rota da cotação interceptada com a **fixture A** do Ambiente da execução |
| Jornadas     | J-01 |
| TC           | TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007, TC-JOURNEY-001 |

## Missão

Como Luana, no celular, confirmar que dá para saber o frete de São Paulo e se o frete grátis vale para ela ainda na
sacola, e chegar ao checkout com o mesmo Total e sem digitar o CEP de novo — procurando qualquer promessa da gaveta
que o checkout desmente.

## Deve tentar

1. Percorrer J-01 inteira: peça abaixo de R$ 450 → ⓘ → calcular 01310-100 → escolher → subir a quantidade até
   passar de R$ 450 → "Finalizar Pedido" → conferir Entrega e Resumo.
2. Comparar, opção a opção, a lista da gaveta com a do bloco Entrega (nome, transportadora, prazo, valor, ordem) e
   conferir na aba de rede que o checkout não chamou a cotação de novo para o mesmo CEP e a mesma sacola.
3. Calcular com 90010-000 (RS) acima da faixa: "liberado" também para o Sul.
4. Com o resultado na tela, tocar "Trocar CEP": volta ao campo sem CEP, e a escolha desfeita.

## Edge cases sugeridos

- CEP colado com espaço ou com o hífen em outro lugar ("01310 100", "013101-00").
- Enter no campo de CEP em vez do botão.
- Duplo toque em "Calcular".
- Voltar do checkout para a página anterior e reabrir a gaveta: o CEP e a escolha continuam.
- Recarregar a página com a gaveta aberta e o frete escolhido (mesma aba).
- Esvaziar a sacola e pôr outra peça: o CEP continua guardado.
- Viewport mínima 320 × 568 com a lista aberta.

## Fora do escopo

- A região fora da campanha, o cupom de frete grátis e a troca de CEP no checkout — são do CH-02.
- A falha da cotação e o "sem opção" — CH-04.
- Medir altura do rodapé, alvos de 44 px, fonte a 200 % — CFR (CH-08). Comparar com o protótipo — CH-07.
- Pagar: a sessão para no Resumo do checkout (o pagamento não é a mudança).
- Os preços e prazos são os da fixture, não do Melhor Envio: valor "estranho" de frete não é achado.
- O resumo do checkout escreve "Correios PAC" e o cartão "PAC · Correios" — dívida conhecida, não abra achado.
- O cálculo de frete da página do produto (só o texto da região é mudança — CH-03) e a faixa de avisos do topo (WI 101).
- Imagens de produto que não carregam (o banco local aponta imagens para o Storage hospedado, bloqueado).
