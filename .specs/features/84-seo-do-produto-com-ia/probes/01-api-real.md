# Probe 01 — `seo-suggest` local contra a Claude API real

**Quando**: 2026-10-28 02:56 UTC (23:56 de 2026-10-27 em Brasília). **Ambiente**: só local — Supabase em
`127.0.0.1:54441`, function servida por `supabase functions serve seo-suggest --env-file .env`
(a `ANTHROPIC_API_KEY` do `.env` da raiz), edge runtime 1.77.4. Login com o admin local do `seed.sql`.
Script: `probes/01-api-real.mjs` (as credenciais entram por variável de ambiente; o script recusa um
`SUPA_URL` que não seja `127.0.0.1`). Modelo `claude-haiku-5-5`, esforço `medium`.

## Resultado

| | |
| --- | --- |
| Chamadas | 5 |
| 200 | **5/5**, todas na **1ª tentativa** (`attempts: 1`) |
| Dentro da régua (conferida pelo probe, fora do servidor) | **5/5** — título ≤ 43, descrição 140–160, sem emoji, sem `!`, sem a marca, título ≠ nome |
| Duração | mín 4,7 s · máx 9,1 s · **p95 9,1 s** (meta ≤ 15 s) |
| Tokens por chamada (log da function) | entrada 2.271–2.563 · saída 958–1.790 (inclui o thinking adaptativo em `medium`) |
| Custo estimado por chamada | ≈ US$ 0,001 (US$ 0,10 / 0,50 por milhão) |
| Exemplos usados | 5 em todas — **todos da mesma categoria**: nenhum dos 5 produtos tem `related_product_ids` no banco local |

## As sugestões

| Produto | Title SEO (sem marca · com marca) | Description SEO (caracteres) |
| --- | --- | --- |
| Joia Afetiva Cachorro Pit Bull Encapsulado com Cinzas de Cremação com nome | Joia Pit Bull com Cinzas de Cremação (36 · 53) | Joia afetiva de Pit Bull feita à mão por Adri Muniz com as cinzas de cremação que você envia, para eternizar a memória do seu cão querido. Envio para o Brasil. (159) |
| Pingente Afetivo coração Iluminar com leite materno, cabelo e coto umbilical em Prata 925 | Pingente Afetivo Leite Materno Prata 925 (40 · 57) | Pingente afetivo de prata 925 feito com o leite materno, cabelo e coto umbilical que você envia. Joia feita à mão por Adri Muniz. Envio para todo o Brasil. (155) |
| Joia Afetiva Cachorro Pinscher Encapsulado com pelo | Joia Afetiva Pinscher com Pelo de Pet (37 · 54) | Joia afetiva em resina com o pelo do seu pinscher, feita à mão por Adri Muniz para eternizar essa memória. Peça personalizada. Envio para todo o Brasil. (152) |
| Pirâmide Memorial Afetivo Árvore da Vida e base com cinzas de cremação | Pirâmide Memorial com Cinzas de Cremação (40 · 57) | Pirâmide memorial em resina cristal com cinzas de cremação que você envia, feita à mão por Adri Muniz para eternizar uma memória. Envio para todo o Brasil. (155) |
| Joia Afetiva Árvore da Vida com Leite Materno | Pingente de Leite Materno Árvore da Vida (40 · 57) | Pingente de leite materno, feito à mão por Adri Muniz com o material que você envia para eternizar esse laço. Peça personalizada. Envio para todo o Brasil. (155) |

## Observações de qualidade (para a revisão da Adri, não reprovam a régua)

1. **O tipo da peça pode ser inferido errado**: o último produto se chama "Joia Afetiva…" e a sugestão
   diz "Pingente". A descrição pode justificar (não conferido); se não, é afirmação inventada. A sugestão
   é rascunho e passa pela revisão dela — mas vale uma linha no prompt: "use o tipo de joia que o nome
   ou a descrição dizem; se não disserem, use 'Joia'".
2. **Detalhe de design some no título** ("coração Iluminar", "Árvore da Vida" no 2º) para caber em 43 —
   esperado pelo teto; a descrição também não o recupera.
3. **"Envio para o Brasil."** no 1º — o modelo encurtou o fecho para caber em 160. Legível, mas foge do
   "Envio para todo o Brasil" pedido.
4. **Personalização perdida**: o 1º produto aceita nome gravado ("com nome") e a sugestão não diz.
5. **Nenhum relacionado no banco local**: a régua A5 caiu sempre no recuo da mesma categoria. A
   precedência "relacionados primeiro" está provada por teste (`examples.test.ts`), não por este probe.

## Não provado aqui

O Supabase hospedado (fora por decisão do usuário: testes só no local) e o volume — 5 chamadas não medem
a taxa real de `off_rules` no catálogo inteiro.
