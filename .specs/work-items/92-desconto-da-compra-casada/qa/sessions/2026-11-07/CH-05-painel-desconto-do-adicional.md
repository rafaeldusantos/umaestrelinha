# Sessão CH-05 · A dona grava, recusa e pré-visualiza o desconto de cada adicional

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-painel-desconto-do-adicional.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri (painel) · conta: `admin-painel`. Premissa da thread: o usuário de desenvolvimento do `supabase/seed.sql` (seção 5, só local), porque `QA_ADMIN_PAINEL_*` não estão definidas. A loja foi aberta anônima num contexto isolado |
| Tour · modo | — · confirmação (sem tour)                                             |
| Rodada      | confirmação                                                            |
| Orçamento   | 23 ações de browser de 25                                              |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium headless (Playwright MCP) · viewport 1440 × 900 |
| Paridade    | banco local com massa sintética da thread; `*.supabase.co` e `/g/collect` bloqueados por rota |

## Missão

Rodada de confirmação: conferir TC-JOURNEY-003 (BUG-006, a prévia da faixa de uma lista incluía o preço de uma peça
que a loja não oferece nessa lista) e o entorno da correção, ou seja, se a prévia bate com o que a loja mostra para a
mesma lista.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e abriu "QA Pingente Estrela", aba "Compre junto" | Adicionais: lista "QA Correntes" com 10, "QA Berloque Coração" com 15, "QA Medalha Afetiva" vazio. Prévia da lista: "As peças de QA Correntes saem de R$ 71,91 a R$ 125,91 com esta joia." (na rodada 1 era "de R$ 62,91 a R$ 116,91"). Berloque: "sai de R$ 59,42 a R$ 63,67" | `screenshots/CH-05-r2-01-previa-lista.png` |
| 02 | Loja anônima, `/produtos/qa-pingente-estrela`, abriu "Ver os 3 modelos" de QA Correntes | "Escolha a peça · 3 modelos": Veneziana de R$ 89,90 por R$ 80,91; Cartier de R$ 119,90 por R$ 107,91; Veneziana Banhada a Ouro… de R$ 129,90 por R$ 116,91. O Berloque não aparece dentro da lista (só como adicional próprio, 15 %). A Corrente Esgotada não aparece | `screenshots/CH-05-r2-02-loja-lista-aberta.png` |
| 03 | Na loja, trocou a variação: Cartier 45 cm / 60 cm; Banhada 80 cm | Cartier 45 cm R$ 107,91, 60 cm R$ 116,91. Banhada 80 cm: "de R$ 139,90 por R$ 125,91". O teto da prévia (R$ 125,91) é a Banhada 80 cm e aparece na loja. O menor preço que a loja oferece na lista é R$ 80,91 (Veneziana) | `screenshots/CH-05-r2-03-loja-banhada-80cm.png` |
| 04 | Painel, a lista "QA Correntes" em /admin/compre-junto | 6 peças: Veneziana (a partir de R$ 89,90), Cartier (R$ 119,90, 2 de 4 variações), Corrente Esgotada (a partir de R$ 79,90), o próprio Pingente Estrela, Berloque Coração (R$ 69,90), Veneziana Banhada (R$ 129,90). A tela avisa: "Peças fora do ar, sem nenhuma variação à venda, ou que sejam a própria joia da página são puladas." | — |
| 05 | Recarregou a loja e abriu a lista de novo | De novo 3 modelos, sem a Esgotada (2ª reprodução) | — |
| 06 | Recarregou a aba do produto no painel; trocou o percentual da lista para 20 e de volta para 10, sem salvar | 10 % → "de R$ 71,91 a R$ 125,91" (2ª reprodução). 20 % → "de R$ 63,92 a R$ 111,92" (63,92 = 79,90 × 0,80, a Esgotada de novo). De volta a 10, a mesma frase. Nada foi salvo; o campo ficou 10 | `screenshots/CH-05-r2-04-previa-lista-recarregada.png` |
| 07 | Saiu da conta e fechou o browser | Tela de login | — |

**Edge cases tentados:** troca de variação na loja (Cartier, Banhada) para ver cada ponta da faixa · percentual alterado e devolvido sem salvar

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-JOURNEY-003 | fail | 01–06 | `screenshots/CH-05-r2-01-previa-lista.png` · `screenshots/CH-05-r2-02-loja-lista-aberta.png` | O caso do BUG-006 foi corrigido: o Berloque (adicional avulso) saiu do piso, e o teto R$ 125,91 bate com a Banhada 80 cm na loja. A peça avulsa bate (Berloque R$ 59,42 nos dois). O piso da lista agora vem da Corrente Esgotada (R$ 79,90 × 0,90 = R$ 71,91), que a loja pula. A prévia ainda diz um preço que a cliente não encontra ⇒ A-1 |

Contagem: pass 0 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Painel · prévia da lista] o piso da faixa vem de uma peça esgotada que a loja não mostra na lista — para a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri (painel)                                                  |
| Jornada e passo     | J-02, passo 5 (comparar com a loja) · passos 01–06 do log             |
| TC                  | TC-JOURNEY-003                                                        |
| Gravidade proposta  | high. É a mesma falha do BUG-006 (a prévia anuncia "por quanto a peça sai" e a loja não tem esse preço), com outra causa: a correção tirou a peça que já é adicional avulso, mas não tira a peça sem variação à venda. Proposta: reabrir o BUG-006 (o entorno da correção) em vez de abrir um bug novo |
| Reproduziu          | sim (2 de 2): a prévia em dois carregamentos e com 20 %, a loja em dois carregamentos |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir**, de um estado limpo:

1. `admin-painel`, `/admin/produtos/<id de "QA Pingente Estrela">/editar`, aba "Compre junto". O adicional 1 é a lista "QA Correntes" a 10 %. A lista inclui a "QA Corrente Esgotada" (a partir de R$ 79,90, sem estoque)
2. Ler a prévia do adicional 1: "As peças de QA Correntes saem de R$ 71,91 a R$ 125,91 com esta joia."
3. Em outra aba, anônima, `http://localhost:8082/produtos/qa-pingente-estrela`. No bloco Compre junto, "Ver os 3 modelos" de QA Correntes

**Esperado:** a faixa da prévia é a das peças que a loja oferece nessa lista com essa joia. Aqui é de R$ 80,91 (Veneziana) a R$ 125,91 (Banhada 80 cm). A tela da lista no painel também diz que peças "sem nenhuma variação à venda" são puladas. **Fonte:** `prd.md` CA-01.5 e CA-02.1; TC-JOURNEY-003 ("o preço levando junto da loja = o da prévia"); BUG-006 (Esperado).

**Observado:** a prévia começa em R$ 71,91 = R$ 79,90 × 0,90, o preço da QA Corrente Esgotada. A loja mostra só Veneziana (R$ 80,91), Cartier (R$ 107,91 / R$ 116,91) e Banhada (R$ 116,91 / R$ 125,91). Com 20 % a prévia diz R$ 63,92 (= 79,90 × 0,80), e a loja não tem esse preço. O teto bate.

**Evidência:**

- `screenshots/CH-05-r2-01-previa-lista.png`: a aba com a prévia "de R$ 71,91 a R$ 125,91"
- `screenshots/CH-05-r2-02-loja-lista-aberta.png`: a lista aberta na loja com os 3 modelos, sem a Esgotada
- `screenshots/CH-05-r2-03-loja-banhada-80cm.png`: a Banhada 80 cm por R$ 125,91 (o teto confere)
- `screenshots/CH-05-r2-04-previa-lista-recarregada.png`: a prévia depois de recarregar
- console: nada
- rede: nada

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- As variações não oferecidas da Cartier (2 de 4) não entram na faixa de forma visível nesta massa. O teto veio da Banhada, então não dá para saber se a prévia as exclui
- Uma peça "fora do ar" (inativa) na lista: a massa não tinha. Ela é a terceira categoria que a loja pula, segundo o painel
- Viewports 1024 e 390: não refeitos (a correção não mexe no empilhamento)
- Massa: nada foi salvo. O percentual da lista foi a 20 e voltou a 10 sem salvar; o banco segue 10 · 15 · vazio em P

## Debrief

- **Surpresas:** a correção do BUG-006 tratou o caso visto (a peça que já é adicional avulso) e não a regra inteira que a loja aplica (pular a peça fora do ar, sem variação à venda e a própria joia). A prévia e a loja ainda não perguntam a mesma coisa.
- **Próximo charter:** reteste do BUG-006 com uma lista que tenha cada tipo de peça pulada (inativa, esgotada, a própria joia, adicional avulso, variação não oferecida) e confirmar as duas pontas da faixa.
- **Padrão novo:** nada
