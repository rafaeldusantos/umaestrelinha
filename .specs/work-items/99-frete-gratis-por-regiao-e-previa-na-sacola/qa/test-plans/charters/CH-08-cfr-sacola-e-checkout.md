# CH-08 · CFR — a sacola com frete e o checkout

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | cfr |
| Prioridade   | P1 |
| Persona      | PER-01 Luana |
| Tour         | — |
| Modo         | — |
| Time-box     | 45 min · orçamento: 35 ações |
| Mudança      | a gaveta inteira (faixa v2, ⓘ, prévia de frete, rodapé compacto) e o bloco Entrega recebendo da sacola — CA-13, CA-22, CA-23 (as medidas que a Validation deixou para o navegador) e CA-08 com M-06 |
| Viewport     | 390 × 844 e 1440 × 900; fonte da raiz a 100 %, 130 % e 200 % onde o caso pede |
| Massa        | só lê; sacola e rascunho próprios |
| Driver       | — |
| Entrada      | `/` · anônima, sacola vazia; cotação interceptada com a **fixture A** |
| Jornadas     | J-01, J-02 |
| TC           | TC-CFR-001, TC-CFR-002, TC-CFR-003 |

## Missão

Refazer J-01 e J-02 como auditoria e medir o que a Validation não pôde: o rodapé da gaveta cabendo na tela do
celular, os alvos de toque, o ⓘ acessível e o balão dentro da gaveta, e nada cortado com a fonte grande.

## Fora do escopo

- Contraste, foco e anúncio de elementos que o Work Item não mudou (cabeçalho da loja, lista de peças, o restante do
  checkout): é `pré-existente` — vai ao log sem achado. O cabeçalho da loja rolando de lado a 390/200 % é conhecido.
- Itens em `px` fixo não crescem com a fonte da raiz — limitação conhecida da simulação.
- Leitor de tela real; Safari/Firefox (só o engine do driver).
- Performance da cotação: ela está interceptada.

## CFR

**Jornadas:** J-01, J-02 — a gaveta e o checkout são toda a superfície da mudança; J-01 percorre a prévia e o
"liberado", J-02 a linha fora da região.

| Categoria             | Na rodada | Por quê, se fora |
| --------------------- | --------- | ---------------- |
| Usabilidade           | sim       |                  |
| Acessibilidade        | sim       |                  |
| Performance percebida | sim       | só o retorno visual do "Calcular" e do salvar da escolha; a latência real do Melhor Envio não existe na rodada (interceptada) |
| Compatibilidade       | sim       |                  |
| Recuperação de erro   | sim       | o "CEP inválido"; a falha da cotação é do CH-04 |
| Paridade com produção | sim       | sempre — é a condição da rodada; desvios: dev server (não build), cotação interceptada, functions com chaves inválidas |
