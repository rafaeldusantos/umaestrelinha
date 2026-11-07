# Sessão CH-05 · A dona grava, recusa e pré-visualiza o desconto de cada adicional

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-painel-desconto-do-adicional.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri (painel) · conta: `admin-painel`. Premissa da thread: o usuário de desenvolvimento do `supabase/seed.sql` (seção 5, só local), porque `QA_ADMIN_PAINEL_*` não estão definidas. A loja foi aberta anônima num contexto isolado |
| Tour · modo | — · confirmação (sem tour)                                             |
| Rodada      | confirmação (rodada 3)                                                 |
| Orçamento   | 13 ações de browser de 13 (uma delas, um clique que não achou a aba, e uma screenshot recusada por caminho) |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium headless (Playwright MCP) · viewport 1440 × 900 |
| Paridade    | banco local com massa sintética da thread; `*.supabase.co` e `/g/collect` bloqueados por rota nos dois contextos |

## Missão

Rodada de confirmação: refazer TC-JOURNEY-003 (que falhou pelo BUG-006: a prévia da faixa de uma lista no painel
incluía no piso o preço de uma peça que a loja não oferece nessa lista) e conferir o entorno da correção (fix task 20,
commit 17ef0715): a prévia não conta no "a partir de" peças que a loja pula.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel, buscou "QA Pingente" em Produtos e abriu "QA Pingente Estrela", aba "Compre junto" | Adicional 1, lista "QA Correntes" (6 peças), com o aviso "Esta joia está na lista e é pulada aqui". Prévia: "As peças de QA Correntes saem de R$ 80,91 a R$ 125,91 com esta joia." (na rodada 2: "de R$ 71,91 a R$ 125,91"). Adicional 2, Berloque Coração: "sai de R$ 59,42 a R$ 63,67" | `screenshots/CH-05-r3-01-previa-lista.png` |
| 02 | Loja anônima, `/produtos/qa-pingente-estrela`, abriu "Ver os 3 modelos" de QA Correntes | O card da lista: "de R$ 89,90 por R$ 80,91 · 10% a menos levando junto". "Escolha a peça · 3 modelos": Veneziana R$ 80,91, Cartier R$ 107,91, Veneziana Banhada… R$ 116,91. Sem a Corrente Esgotada, sem o Berloque dentro da lista. Berloque avulso: de R$ 69,90 por R$ 59,42 (15 %) | `screenshots/CH-05-r3-02-loja-lista-aberta.png` |
| 03 | Recarregou a aba do produto no painel e leu a prévia de novo | A mesma frase, "de R$ 80,91 a R$ 125,91" (2ª reprodução) | — |
| 04 | Saiu da conta e fechou o browser | Tela de login | — |

**Edge cases tentados:** recarregar a aba do painel e reler a prévia

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-JOURNEY-003 | pass | 01–03 | `screenshots/CH-05-r3-01-previa-lista.png` · `screenshots/CH-05-r3-02-loja-lista-aberta.png` | Piso da prévia R$ 80,91 = o menor preço que a loja oferece na lista (Veneziana, e o "por" do card da lista). Teto R$ 125,91 = a Banhada 80 cm, vista na loja na rodada 2 (não reaberta aqui por orçamento). Berloque avulso R$ 59,42 nos dois lados. A Esgotada saiu do piso; o Berloque continua fora da lista |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- Uma peça inativa (fora do ar) na lista: a massa não tinha, e produzi-la pela UI (desativar uma peça) não coube no orçamento de 13 ações. É a terceira categoria que a loja pula; a correção só ficou provada aqui para a esgotada, o adicional avulso e a própria joia
- As variações não oferecidas da Cartier (2 de 4): o teto vem da Banhada, então não dá para ver se a prévia as exclui
- O teto R$ 125,91 na loja não foi reaberto nesta rodada (a Banhada 80 cm foi vista na rodada 2; a massa não mudou)
- Viewports 1024 e 390: não refeitos (a correção não mexe no empilhamento)
- A tela mostra uma segunda lista, "QA Probe Sem Venda" (1 peça, em nenhuma joia), que não estava na rodada 2; não foi tocada
- Massa: nada foi salvo nem alterado; o banco segue 10 · 15 · vazio em P

## Debrief

- **Surpresas:** nada
- **Próximo charter:** se a regressão pedir, uma lista com uma peça inativa para fechar a última categoria que a loja pula
- **Padrão novo:** nada
