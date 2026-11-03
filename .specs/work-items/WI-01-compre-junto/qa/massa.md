# Massa de dados do QA — Compre Junto (WI-01)

Criada em 2026-11-02 no **banco Supabase local** (Postgres em `127.0.0.1:54442`, API em `:54441`). Nada
foi criado no projeto hospedado, e nenhuma linha que já existia foi alterada ou apagada: só inserções
novas. Todo produto novo começa por **"QA "** no nome e por **`qa-`** no endereço.

- Loja: `http://localhost:8082`
- Painel: `http://localhost:8083` — o formulário do produto é `/admin/produtos/<id>/editar`; as listas
  ficam em `/admin/compre-junto` e cada uma em `/admin/compre-junto/listas/<id>`.
- **Desconto do PIX: 7 %** (`store_settings.payment.pix_discount_percent`; PIX e cartão ligados, até 4
  parcelas, parcela mínima R$ 20).
- **Forma do bloco**: não há nada gravado (a chave `buy_together` não existe em `store_settings`), então
  a loja usa a forma padrão, **"Na linha"**. As outras duas, "Em folha" e "Com fórmula", só aparecem se
  alguém escolher no painel.

Regras da loja que explicam o que se vê (lidas do código):

- Variação **esgotada** = estoque 0 com política "controlar estoque" (todas as peças de QA usam essa
  política). Ela aparece desabilitada; uma peça com **todas** as variações esgotadas **some** do bloco.
- Uma lista **pula o próprio produto principal** e **pula a peça que já é adicional avulso** do mesmo
  produto (a peça avulsa vence a lista).
- O campo de **gravação** só aparece quando a variação escolhida tem "Com gravação: Sim". O limite é o
  do cadastro de cada peça; sem limite cadastrado, vale o padrão de **20 caracteres**.
- Todas as fotos são reaproveitadas de produtos reais do catálogo local (a foto não corresponde ao
  nome de QA — é esperado).

---

## M-01 — QA Pingente Estrela (o caso principal)

- Loja: http://localhost:8082/produtos/qa-pingente-estrela
- Painel: http://localhost:8083/admin/produtos/180c5b2c-a679-4911-ac4a-6d6eb9b08005/editar
- Gravação: **limite de 12 caracteres**. Não exige material.
- Dois eixos: **Tipos de elo** (Prata 925, Folheado a ouro, Chaveiro) × **Com gravação** (Não, Sim).

| Variação | Preço | Estoque |
| --- | --- | --- |
| Prata 925 · Não | R$ 259,90 | 10 |
| Prata 925 · Sim | R$ 279,90 | 10 |
| Folheado a ouro · Não | R$ 289,90 | 10 |
| Folheado a ouro · Sim | R$ 309,90 | 10 |
| Chaveiro · Não | R$ 239,90 | 10 |
| **Chaveiro · Sim** | R$ 259,90 | **0 — combinação indisponível** |

O "a partir de" da vitrine é R$ 239,90 (menor preço de variação).

**Adicionais, nesta ordem:**

1. **A1 — lista "QA Correntes"** (ver M-02).
2. **A2 — peça avulsa "QA Berloque Coração"**, com só **2 das 3** cores liberadas: Prata 925 (R$ 69,90)
   e Folheado a ouro (R$ 74,90). A cor Rosé (R$ 79,90) existe no produto, mas **não** é oferecida aqui.
   **Some quando o tipo de elo escolhido do pingente é "Chaveiro"** (as duas variações de Chaveiro).
3. **A3 — peça avulsa "QA Medalha Afetiva"**, que **exige material** (cinzas). Cores: Prata 925
   (R$ 149,90) e Folheado a ouro (R$ 164,90), estoque 10 cada.

O que se espera ver na lista A1 dentro de M-01: **QA Corrente Veneziana** e **QA Corrente Cartier**. A
Esgotada some (tudo esgotado), o próprio pingente some (é o principal) e o Berloque some (já é o A2).
**Atenção**: com o elo "Chaveiro" escolhido, o A2 desaparece e o Berloque deixa de ser "repetido" —
pela regra do código, ele passa a aparecer **dentro da lista**, e com as **3** cores (a lista não
restringe variações). Vale conferir se esse comportamento é o desejado.

## M-02 — lista "QA Correntes"

- Painel: http://localhost:8083/admin/compre-junto/listas/318c6fb9-f851-4b50-8543-acb1413e3907
- Em uso em **2 joias** (M-01 e M-03). Excluir a lista deve ser recusado nomeando as duas.
- Peças, nesta ordem (nenhuma com variação restrita):

| Posição | Peça | Loja | Variações |
| --- | --- | --- | --- |
| 1 | QA Corrente Veneziana | http://localhost:8082/produtos/qa-corrente-veneziana | Comprimento: 40 cm R$ 89,90 · 45 cm R$ 94,90 · **50 cm R$ 99,90 esgotada** |
| 2 | QA Corrente Cartier | http://localhost:8082/produtos/qa-corrente-cartier | Comprimento (45 cm, 60 cm) × Com gravação (Não, Sim): 45·Não R$ 119,90 · 45·Sim R$ 139,90 · 60·Não R$ 129,90 · 60·Sim R$ 149,90, estoque 10 cada. **Gravação com limite de 30 caracteres** (o pingente tem 12) |
| 3 | QA Corrente Esgotada | http://localhost:8082/produtos/qa-corrente-esgotada | 40 cm R$ 79,90 e 45 cm R$ 84,90, **as duas esgotadas** — a peça não deve aparecer no bloco |
| 4 | QA Pingente Estrela (o M-01) | — | deve ser pulada na página do M-01 |
| 5 | QA Berloque Coração | http://localhost:8082/produtos/qa-berloque-coracao | Cor: Prata 925 R$ 69,90 · Folheado a ouro R$ 74,90 · Rosé R$ 79,90, estoque 10 cada |

Painel das peças: Veneziana `7b2aaa9b-3b77-440d-9bef-38a7883f7e85`, Cartier
`00e189e5-6538-4341-a0f5-4eb38b909092`, Esgotada `12914e4e-6e97-4457-88f5-fb9197182eca`, Berloque
`97d86ace-8536-46c2-86f5-f997491d4855`, Medalha `dcc14cc6-5bdb-41ab-8993-bf2f3e6ea735` (use
`http://localhost:8083/admin/produtos/<id>/editar`).

## M-03 — QA Pingente Lua

- Loja: http://localhost:8082/produtos/qa-pingente-lua
- Painel: http://localhost:8083/admin/produtos/711614f6-7a28-4dc9-92a1-d78361110ba4/editar
- Tipos de elo: Prata 925 R$ 219,90 · Folheado a ouro R$ 239,90 (estoque 10 cada). Sem gravação no eixo.
- Um adicional: **A1 — lista "QA Correntes"**. Aqui o Berloque **não** é avulso, então a lista deve
  mostrar: Veneziana, Cartier, **QA Pingente Estrela** e Berloque Coração (a Esgotada some).

## M-04 — QA Joia Sem Compre Junto

- Loja: http://localhost:8082/produtos/qa-joia-sem-compre-junto
- Painel: http://localhost:8083/admin/produtos/ee13bca9-19ec-4dd7-9a08-e5087ca3b832/editar
- Tipos de elo: Prata 925 R$ 199,90 · Folheado a ouro R$ 219,90 (estoque 10 cada).
- **Nenhum adicional**: o bloco Compre Junto não deve aparecer.

## M-05 — QA Joia Esgotada

- Loja: http://localhost:8082/produtos/qa-joia-esgotada
- Painel: http://localhost:8083/admin/produtos/e5cbea6d-be49-49d7-9433-8c3b28b8ecfd/editar
- Tipos de elo: Prata 925 R$ 229,90 · Folheado a ouro R$ 249,90 — **as duas esgotadas**.
- Um adicional: peça avulsa **QA Berloque Coração** (as 3 cores, nenhuma restrição).

## M-06 — QA Pingente Estrela Guia com Nome Bem Longo Para Testar Quebra de Linha

- Loja: http://localhost:8082/produtos/qa-pingente-estrela-guia-nome-longo
- Painel: http://localhost:8083/admin/produtos/24521969-6418-46d7-9d72-903f589283ca/editar
- Tipos de elo: Prata 925 R$ 269,90 · Folheado a ouro R$ 289,90 (estoque 10 cada).
- Três adicionais avulsos, nesta ordem, todos com nomes e valores de variação longos (estoque 10):
  1. **QA Corrente Veneziana Banhada a Ouro Dezoito Quilates Comprida** — Comprimento: "Setenta
     centímetros de comprimento" R$ 129,90 · "Oitenta centímetros de comprimento" R$ 139,90.
  2. **QA Berloque Coração Vazado com Pedra Natural de Quartzo Rosa Lapidada à Mão** — Cor: "Prata 925
     com banho de ródio negro" R$ 99,90 · "Prata 925 folheada a ouro rosé" R$ 109,90.
  3. **QA Medalha Redonda Personalizada com Nome e Data em Prata Novecentos e Vinte e Cinco** — Tamanho:
     "Pequena de quinze milímetros" R$ 159,90 · "Grande de vinte e cinco milímetros" R$ 179,90.

## Lista "QA Probe Sem Venda"

- Painel: http://localhost:8083/admin/compre-junto/listas/a56013a7-480f-4e87-9b6f-2de2458d80b5
- Uma peça (QA Corrente Veneziana), **sem uso** em nenhuma joia: excluir deve ser permitido.

## Exemplo de conta (PIX 7 %)

M-01 Prata 925 · Não (R$ 259,90) + Veneziana 40 cm (R$ 89,90) + Berloque Prata 925 (R$ 69,90) =
R$ 419,70; no PIX, R$ 390,32 (419,70 × 0,93 = 390,321). Confira o arredondamento contra o que a loja
mostra, sem tomar este número como verdade.
