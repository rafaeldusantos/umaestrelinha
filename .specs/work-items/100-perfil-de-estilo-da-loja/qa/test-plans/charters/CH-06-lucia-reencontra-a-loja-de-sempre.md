# CH-06 · Lúcia reencontra a loja de sempre no perfil Padrão

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-04 Lúcia                                                                  |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-04), comparando com a referência                               |
| Time-box     | 90 min · orçamento 70 ações                                                   |
| Mudança      | as cores da loja passaram a vir de variáveis CSS por perfil (RN-01: o Tailwind lê `rgb(var(--estrelinha-<t>-rgb) / <alpha>)`, sombras por variável, papel de desconto novo com os valores de hoje); no Padrão nada pode ter mudado (CA-01, RN-06) |
| Viewport     | 390 × 844 em todas as telas; 1440 × 900 em Home, categoria, produto e checkout |
| Massa        | **só lê** — perfil salvo = Padrão ou ausente (S0); o **pedido PIX pendente da `cliente-qa`** criado pela thread antes do L1 (`/pedido/:id` no manifesto); a referência em `:8092` lê o mesmo banco local. **Não paga e não cria pedido** |
| Driver       | `—`                                                                           |
| Entrada      | `http://localhost:8082/` e a referência `http://localhost:8092/` (ver Ambiente) · sem login; entra na conta `cliente-qa` nas duas para `/conta` e a confirmação |
| Jornadas     | J-04                                                                          |
| TC           | TC-SMOKE-001, TC-REG-001                                                      |

## Missão

Como a cliente que volta e conhece a loja de cor, achar qualquer tom, transparência, sombra ou marca que esteja
diferente da loja de antes do Work Item quando a dona não ligou nada.

## Deve tentar

1. Para cada tela (Home, categoria, produto em oferta, sacola com a peça, checkout, `/conta` e a confirmação
   `/pedido/:id` do manifesto), abrir no worktree e na referência, no mesmo viewport, e ler com **um** `eval` por tela
   as cores computadas (`color`, `background-color`, `border-color`, `box-shadow`, `stroke`/`fill` da marca) dos
   elementos de referência; screenshot das duas
2. Procurar as transparências: um fundo `/10`, um texto `/80` ou `/70`, o véu do menu do celular, o hover de um cartão
3. Conferir o selo "-X%", a barra do frete grátis e as sombras (cartão, aviso de cookies, convite do Instagram) —
   devem estar exatamente como na referência
4. Repetir Home, categoria, produto e checkout em 1440

## Edge cases sugeridos

- Foco (Tab) num link e num botão: a cor do anel de foco
- Campo com erro no checkout (borda `field`)
- Menu do celular aberto
- O aviso de cookies na primeira visita (sombra)
- Hover sobre o botão primário em 1440
- Tela de 404 (`/nao-existe`) — a marca e o botão
- Na confirmação: o selo de situação do pedido pendente e a lista de passos

## Fora do escopo

- Pagar, gerar PIX ou criar pedido — na confirmação, nenhum toque em "Pagar com PIX" ou ação de pagamento
- Diferenças que vêm de outro trabalho entre a referência e o worktree (se a referência não for a base exata do branch —
  ver Ambiente): registre a tela e siga; só é achado o que for cor, sombra ou transparência
- Conteúdo dinâmico (produtos, ordem, faixa de avisos com aviso girando, os dados do pedido)
- O perfil Black Friday (CH-04)
- O painel (não muda por este WI no Padrão)
