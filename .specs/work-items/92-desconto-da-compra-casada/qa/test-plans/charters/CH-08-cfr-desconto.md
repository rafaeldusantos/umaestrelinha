# CH-08 · CFR — o desconto do Compre Junto nas duas jornadas da cliente

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | cfr                                                                           |
| Prioridade   | P1                                                                            |
| Persona      | PER-05 Sônia                                                                  |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 45 min · orçamento: 35 ações                                                  |
| Mudança      | as frases e os números novos do bloco, da gaveta, do checkout, da tela "o valor mudou", da confirmação e de Minha conta (CA-02.1..02.3, CA-03.8, CA-04.3, CA-05.2, RNF-05, RNF-06) — o resto das telas é `pré-existente` |
| Viewport     | 390 × 844 com fonte a 200 %; 1440 × 900 só teclado                             |
| Entrada      | `/produtos/<slug de P>` · anônima, sacola vazia                                |
| Jornadas     | J-01, J-03                                                                    |
| TC           | TC-CFR-001, TC-CFR-002, TC-CFR-003, TC-UI-003                                 |

## Missão

Refazer J-01 e J-03 como auditoria das qualidades transversais sobre o que o WI mudou: o tom das frases novas, o
anúncio do desconto pelo teclado, a recuperação das falhas de dinheiro e o layout em 390 com fonte grande.

## Deve tentar

1. Ler cada frase nova (bloco, gaveta, checkout, aviso, confirmação, Minha conta, e-mail) procurando exclamação,
   "economize", urgência, contagem.
2. Chegar à caixa da corrente pelo Tab e ler o nome acessível ("…, 15% a menos levando junto") e o "de … por …".
3. Provocar o aviso "o valor do seu pedido mudou" e ver se é anunciado (`role="alert"`) e onde fica o foco.
4. Medir `scrollWidth` do `body` nas telas do pedido (confirmação, Minha conta, painel, app) em 390.

## Edge cases sugeridos

- Só teclado, do bloco ao checkout
- Fonte a 200 % e zoom de 200 % (640 px de largura)
- Movimento reduzido
- Tema escuro (se o sistema forçar)
- Rede caindo no envio do pagamento

## Fora do escopo

- Contraste, foco e anúncio de elementos que o WI não mudou (o resto da página do produto, do checkout, do painel).
- Leitor de tela real (VoiceOver, TalkBack) — Fora da cobertura.
- Safari/iOS e Chrome Android — só o engine do driver.

## CFR

**Jornadas:** J-01, J-03 — a maior superfície da mudança: bloco, sacola, checkout, pagamento e pedido, com e sem
cupom.

| Categoria             | Na rodada | Por quê, se fora                           |
| --------------------- | --------- | ------------------------------------------ |
| Usabilidade           | sim       |                                            |
| Acessibilidade        | sim       |                                            |
| Performance percebida | sim       | (a gaveta com a configuração relida a cada abertura, `staleTime: 0`; sacola com várias linhas) |
| Compatibilidade       | sim       |                                            |
| Recuperação de erro   | sim       |                                            |
| Paridade com produção | sim       | sempre — é a condição da rodada; registrar: ambiente local, chaves externas inválidas, Mercado Pago não alcançado |
