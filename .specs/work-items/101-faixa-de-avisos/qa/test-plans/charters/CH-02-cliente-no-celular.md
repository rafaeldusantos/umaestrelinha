# CH-02 · A cliente que vem do anúncio, no celular

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-02 Bia |
| Tour         | Feature |
| Modo         | por cenário (J-02) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | a faixa acima do cabeçalho em toda página do `StoreLayout` e fora das de pagamento; giro de 6 s com pausa pelo dedo; o aviso inteiro como link no celular; altura de duas linhas; o cabeçalho que só recolhe depois da faixa (UC-01, RN-01, RN-07, CA-01, CA-02, CA-04, CA-07) |
| Viewport     | 390 × 844 (e 360 × 800 na variação de TC-UI-001) |
| Massa        | só lê a faixa do manifesto; põe um produto na sacola (sessão anônima, sem pedido) |
| Driver       | — |
| Entrada      | `http://localhost:8082/produtos/<slug de um produto de C2>` · sem sessão, sacola vazia |
| Jornadas     | J-02 |
| TC           | TC-JOURNEY-001, TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-FUNC-014, TC-UI-001 |

## Missão

Confirmar que a Bia, chegando por um anúncio direto num produto, no celular e com rede lenta, vê a Black Friday, consegue ler o aviso antes de ele trocar e chega às ofertas em um toque — e que a faixa não a acompanha até o pagamento.

## Deve tentar

1. Ler cada um dos quatro avisos no produto, segurando o dedo na faixa quando precisar.
2. Tocar em pontos diferentes do aviso (destaque, texto, rótulo, arte) e no aviso sem link.
3. Rolar o produto e a categoria para baixo e para cima, de devagar a rápido.
4. Ir até o checkout e ao `/pedido-montado`, sem preencher nada.

## Edge cases sugeridos

- Viewport mínima (360)
- Fonte do sistema a 130 %
- Voltar do checkout para o produto
- Aba em segundo plano por 20 s
- Arrastar o dedo começando sobre a faixa (rolar, não abrir)
- URL inexistente (404 sem faixa)

## Fora do escopo

- Pagar, digitar cartão, gerar PIX ou criar pedido — nunca
- O checkout em si, a sacola, o frete e o produto (só a presença ou ausência da faixa importa)
- O que o cache da Vercel faz (5 min / 1 h): fora do ambiente local
- O CLS medido: CH-07; a fonte a 200 %: CH-07
- Botão de fechar a faixa, faixa por página, contador (PRD › Fora)
- O aviso de cookies e o balão do WhatsApp: pré-existentes — só é achado se cobrirem a faixa
