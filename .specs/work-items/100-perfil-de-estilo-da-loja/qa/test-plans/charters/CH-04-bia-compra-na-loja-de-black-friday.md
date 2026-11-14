# CH-04 · Bia percorre a loja de Black Friday do celular ao computador

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-02 Bia                                                                    |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-03)                                                            |
| Time-box     | 90 min · orçamento 70 ações                                                   |
| Mudança      | o perfil Black Friday nas telas da cliente: os tokens trocados (RN-01), o desconto em ouro — selo "-X%" do cartão e da página do produto, barra do frete grátis (RN-01; spec H2, H3, H4), a marca desenhada no tom escuro e `theme-color`/favicon/imagem de compartilhamento fixos (RN-06), legibilidade (RN-03), nas telas de RN-08 em 390 e 1440 — inclusive a conta e a confirmação do pedido |
| Viewport     | 390 × 844 primeiro, depois 1440 × 900                                         |
| Massa        | **só lê** — perfil salvo = Black Friday (S1); frete grátis ligado e um produto com preço "de/por" (manifesto do Ambiente); o **pedido PIX pendente da `cliente-qa`** criado pela thread antes do L1 (`/pedido/:id` no manifesto); a sacola é do browser desta sessão. **Não paga e não cria pedido** |
| Driver       | `—`                                                                           |
| Entrada      | `http://localhost:8082/` · sem login, sacola vazia; entra na conta `cliente-qa` no passo da conta |
| Jornadas     | J-03                                                                          |
| TC           | TC-JOURNEY-002, TC-PERSONA-001, TC-FUNC-009, TC-FUNC-010, TC-FUNC-011         |

## Missão

Como cliente no celular, confirmar que dá para ir da Home ao checkout com a loja de preto e ouro lendo tudo — e que o
desconto continua saltando aos olhos —, procurando texto que sumiu no fundo, selo de oferta confundido com os outros e
a marca com a cor errada.

## Deve tentar

1. Em 390: Home → categoria → produto em oferta → sacola → checkout, lendo em cada tela as cores computadas dos
   elementos de referência (cabeçalho, faixa de departamentos, botão primário, link "Ver todos", preço, parcelas, selo
   "-X%", selo "Novo"/"Últimas", barra do frete grátis, borda de campo, rodapé, marca) e medindo o contraste de 3 a 5
   textos pequenos por tela
2. Entrar em `/conta` com o código do Mailpit e conferir a conta; abrir a confirmação do pedido da conta pela URL
   `/pedido/:id` do manifesto (o pedido PIX pendente da thread) e conferir cores e contraste — **sem** tocar em "Pagar
   com PIX", "Gerar um código novo" ou qualquer ação de pagamento
3. Repetir Home, categoria, produto, sacola, checkout, conta e confirmação em 1440
4. Conferir a marca desenhada (rodapé, menu do celular, cabeçalho do checkout, Home) e, no `<head>`, `theme-color`,
   o favicon e a `og:image` — iguais aos do Padrão

## Edge cases sugeridos

- Produto com selo "-X%" **e** "Novo" no mesmo cartão
- Sacola com valor abaixo da faixa de frete grátis (barra parcial) e acima (completa)
- Foco visível (Tab) sobre o cabeçalho quase preto e sobre os botões ouro
- Menu do celular aberto (a marca dentro dele)
- Campo do checkout com erro de validação (borda `field`, texto de erro)
- Fonte do sistema a 130 % na página do produto
- A gaveta de material da página do produto ("Como enviar seu material"), se o produto pedir material
- Na confirmação: o selo de situação do pedido pendente e a lista de passos — o texto do selo sobre o fundo dele

## Fora do escopo

- Pagar, gerar PIX, digitar cartão, criar pedido — o pedido da confirmação é da thread; a sessão só o abre
- O conteúdo do pedido (itens, valores, situação): é massa, não achado deste WI
- O selo da campanha (WI 102) — cores cadastradas na campanha, não dependem do perfil
- A faixa de avisos (WI 101) — muda de cor com o perfil sem trabalho próprio; o que se notar nela é backlog
- "Joias em oferta" e o link "Black Friday" no menu desenhados no protótipo (WIs 101/102)
- O chip de desconto da sacola: a T06 não encontrou elemento com fundo `primary` (spec H4) — nada mudou nele; só
  registre se existir um selo de desconto **em ardósia** na sacola no Black Friday
- Comparar com o protótipo (CH-07) e com a loja de antes (CH-06)
- A pintura em ardósia por um instante ao abrir no dev server (R2; primeira pintura é do CH-08)
