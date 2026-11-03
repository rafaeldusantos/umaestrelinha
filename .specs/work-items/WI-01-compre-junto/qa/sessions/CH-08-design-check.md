# Sessão CH-08 · design-check — bloco, barra fixa, sacola e telas do painel · Claude Design

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-08-design-check.md` · design-check · P1        |
| Status      | done                                                                   |
| Persona     | PER-02 Adri · conta: `admin-painel` (usuário de desenvolvimento do `seed.sql`, seção 5 — valor não registrado) · `anonima` (loja) |
| Tour · modo | — · —                                                                  |
| Rodada      | confirmação (rodada 2) — os 6 TC que deram `fail` na rodada 1 e o entorno das correções BUG-003, 005, 006, 007, 008, 010, 011, 012, 013 |
| Orçamento   | 20 ações de browser de 25 (várias compostas por `browser_run_code_unsafe`; inclui 2 chamadas perdidas — um seletor ambíguo e um `beforeunload` — e 1 `handle_dialog`) |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · build `não exposto` (dev servers do worktree feature/WI-01) · Chromium (Playwright MCP) · viewports 390×844 · 1440×900 |
| Paridade    | Supabase local :54441; `*.supabase.co` e `**/g/collect*` bloqueados por rota (os 5 erros de console na Home são as imagens de seção apontando para o Storage hospedado, bloqueadas de propósito); massa QA-* (M-01, M-02, M-04) |

## Missão

Conferir, tela a tela, as telas entregues contra os protótipos do Claude Design do Work Item, registrando cada diferença com o valor do design e o observado.

**Régua desta rodada:** o protótipo não foi reaberto (rodada de confirmação, sem design-check completo). A régua é o "Esperado" de cada BUG (003, 005–008, 010–013) e a coluna "design" da tabela D1–D37 da sessão `sessions/2026-11-02/CH-08-design-check.md`, que foram lidos do protótipo pelo MCP do Claude Design na rodada 1.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir M-01 anônima em 390, bloco "Na linha", nada marcado | superfície branca, borda 1px `#e6dfd4`, raio 20, padding 18/16/16; título "Compre junto" 20/400; caixas 24×24 com borda 2px; fotos 64×80 com raio 12 no invólucro; nome com o preço abaixo, sem "a partir de"; "Ver os 2 modelos" na lista; `scrollWidth` 390 | `screenshots/R2-CH-08-01-bloco-390-nada.png` |
| 02 | Marcar a lista e o berloque, tocar "Levar o conjunto" sem escolher | antes de tocar: nenhuma mensagem de falta; depois: "Escolha a peça." na lista e "Escolha o cor da qa." no berloque (minúscula, BUG-003), e o alerta "Falta uma escolha em 2 peças. Elas estão marcadas acima." logo abaixo do bloco | `screenshots/R2-CH-08-02-bloco-390-falta.png` |
| 03 | Escolher Veneziana 40 cm e Prata 925 | resumo "QA Corrente Veneziana · 40 cm" e "Prata 925"; total R$ 419,70 · R$ 390,32 no Pix; as mensagens e o alerta saem | `screenshots/R2-CH-08-03-bloco-390-completo.png` |
| 04 | Conferir a barra fixa com o conjunto | "R$ 419,70 · Conjunto · 3 peças · Levar o conjunto" | `screenshots/R2-CH-08-04-barra-390-conjunto.png` |
| 05 | Levar o conjunto e abrir a gaveta | duas linhas com "Acompanha o QA Pingente Estrela" em 12,5px, cor `rgb(84,97,107)`, precedidas de um traço 10×1px `rgb(184,148,95)` (#b8945f) | `screenshots/R2-CH-08-05-gaveta-390-acompanha.png` |
| 06 | M-01 em 1440, marcar só o berloque | padding 22/22/20, raio 20, borda igual; nenhuma mensagem de falta ao marcar; `scrollWidth` 1440 | `screenshots/R2-CH-08-06-bloco-1440.png` |
| 07 | Entrar no painel e abrir `/admin/compre-junto` em 1440 | subtítulo do protótipo; aba "Listas 2" com o número dentro e "Adesão"; tabela em cartão com Lista/Peças/Em uso em/Atualizada; "5 de 12 · 2 joias" e "1 de 12 · Nenhuma joia"; nenhum "Listas (n)" | `screenshots/R2-CH-08-07-indice-1440.png` |
| 08 | Índice em 390, depois a aba Adesão em 390 | cartões "5 peças · em uso em 2 joias" e "1 peça · em nenhuma joia"; Adesão com os 3 indicadores, a régua e "Nenhum pedido teve peças compradas junto nos últimos 30 dias."; `scrollWidth` 390 nas duas | `screenshots/R2-CH-08-08-indice-390.png` · `screenshots/R2-CH-08-09-adesao-390.png` |
| 09 | Adesão em 1440, 90 dias | "0% dos 16 pedidos pagos" e o estado vazio; a massa M-08 (pedidos com Compre Junto) não existe mais no banco local — foi temporária no reteste do BUG-013 e apagada —, então o cartão "Por joia principal / Por lista" não aparece | `screenshots/R2-CH-08-10-adesao-1440-90d.png` |
| 10 | Editor de M-02 (QA Correntes) em 1440 | trilha "Compre Junto › QA Correntes"; dica sob o nome ("É este nome que a cliente lê no Compre Junto…"); "12 / 40"; "5 de 12"; "Acrescentar uma peça" sem lista aberta; "Variações oferecidas: todas as ativas (n)"; "Em uso" com "2 joias oferecem esta lista…"; "Como a cliente vê" com "o bloco mostra o nome da lista e as peças nesta ordem, e a cliente escolhe uma" | `screenshots/R2-CH-08-11-editor-m02-1440.png` |
| 11 | Aba "Compre junto" de M-01 em 1440 | "3 de 3 adicionais"; dicas de nome ("O nome da lista é o que a cliente lê no bloco." / "O nome do produto é…"); "a partir de R$ 69,90 · Trocar"; "Variações oferecidas: 2 de 3 · Esconder · Oferecer todas"; cartão "Na loja" com "O bloco fica entre a escolha da variação e o botão de compra, nesta ordem:" e a lista ordenada; "Quando a peça sai do ar" abaixo | `screenshots/R2-CH-08-12-aba-produto-m01-1440.png` |
| 12 | Voltar ao índice para trocar a forma | o formulário do produto disparou "sair sem salvar" (`beforeunload`) sem nenhuma edição — aceito, nada gravado. Já registrado como pré-existente (feature 85; qa-result 2026-11-02) | — |
| 13 | Trocar a forma para "Em folha" e salvar | após recarregar: `sheet` marcada | — |
| 14 | M-01 em 390, marcar a lista; M-01 em 1440, marcar o berloque | linhas de peça com o link "Escolher" e a lista com "Ver os 2 modelos"; folha com "Escolha a peça." **uma** vez, acima de "Incluir no conjunto"; diálogo em 1440 com 520px de largura e raio 20, "Escolha o cor da qa." uma vez | `screenshots/R2-CH-08-13-folha-390.png` · `screenshots/R2-CH-08-14-dialogo-1440.png` |
| 15 | Trocar para "Com fórmula", abrir M-01 em 1440 e marcar o berloque | faixa sem fundo; 4 fotos 64×80 com raio 12; nomes em 11px abaixo; "+" entre os itens; opacidade efetiva 1 em "Esta joia" e no berloque marcado, 0,35 nos não marcados; nenhuma mensagem de falta ao marcar | `screenshots/R2-CH-08-15-formula-1440.png` |
| 16 | Devolver a forma para "Na linha" e salvar | após recarregar: `inline` marcada, `sheet` e `formula` desmarcadas. Estado igual ao de entrada da sessão | — |
| 17 | Sair da conta pelo menu, limpar `localStorage`/`sessionStorage` da loja e do painel, limpar cookies, fechar o browser | feito (a sacola com as 3 linhas do passo 05 foi descartada com o storage) | — |

**Edge cases tentados:**

- Recarregar o painel depois de cada troca de forma — a forma gravada persiste (passos 13, 16)
- Ausência da mensagem de falta antes de tentar comprar, nas três formas (passos 02, 06, 15)
- Os demais (índice vazio, peça fora do ar, recusas da 13ª e do 4º) — fora desta rodada de confirmação

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-UI-001 | pass | 01–03, 06 | `screenshots/R2-CH-08-01…03`, `R2-CH-08-06` | D1–D13 conferem (BUG-005); "Escolha o cor da qa." (BUG-003); falta só depois de tentar. "Principal indisponível" segue inalcançável (spec-gap da rodada 1, não reconferido) |
| TC-UI-002 | pass | 04–05 | `screenshots/R2-CH-08-04`, `R2-CH-08-05` | barra igual; traço 10×1 `accent` (BUG-008) |
| TC-UI-003 | pass | 14–15 | `screenshots/R2-CH-08-13…15` | folha sem falta em dobro, diálogo 520, link "Escolher" (BUG-006); faixa com fotos (BUG-007) |
| TC-UI-004 | pass | 07–08, 10 | `screenshots/R2-CH-08-07`, `R2-CH-08-08`, `R2-CH-08-11` | índice (BUG-012) e editor (BUG-011) conforme o Esperado. Peça fora do ar e índice vazio não reconferidos |
| TC-UI-005 | pass | 11 | `screenshots/R2-CH-08-12` | cartão "Na loja" e textos (BUG-010). Recusa do 4º não reconferida (já igual na rodada 1) |
| TC-UI-006 | blocked | 08–09 | `screenshots/R2-CH-08-09`, `R2-CH-08-10` | `massa`: sem pedido com Compre Junto no banco local (M-08 foi temporária e apagada no reteste do BUG-013), o cartão do recorte "Por joia principal / Por lista", o alternador e as colunas não aparecem. O que aparece — indicadores, régua, vazio (CA-06.4, sem frame) e 390 sem rolagem — confere. O título do recorte foi conferido no reteste do BUG-013 com massa temporária |

Contagem: pass 5 · fail 0 · blocked 1 · skip 0

## Achados

nada

Observações (sem achado, polimento ou já registrado):

- O alerta "Falta uma escolha em 2 peças. Elas estão marcadas acima." fica logo abaixo do bloco, fora do rodapé do total; o protótipo o põe dentro do `cj-total` e diz "Ela está marcada acima." para N peças. A posição já foi decidida na triagem da rodada 1 (qa-result 2026-11-02, "CH-08 A-2 — conforme a fonte"); a concordância no plural é coerente com N > 1. Polimento.
- O formulário do produto pede confirmação de saída sem nenhuma edição (passo 12) — pré-existente, já registrado (feature 85).

## Design

**Protótipo:** três arquivos do Claude Design (Loja `69224d8a…`, Backoffice `e3957c10…`) · `claude_design` · **não reaberto nesta rodada**; régua = Esperado dos BUG-003/005–008/010–013 e coluna "design" de D1–D37 da sessão de 2026-11-02 (lidas do protótipo pelo MCP do Claude Design na rodada 1)

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| —  | — | — | — | — | nenhuma divergência nova ou reaberta nas telas corrigidas | — | — |

**Telas não conferidas:** Adesão com venda (recorte por joia/por lista) — `blocked` por massa; índice vazio, peça fora do ar no editor, recusas da 13ª peça e do 4º adicional, estado "sem adicionais" — fora da rodada de confirmação (iguais na rodada 1 ou sem correção que as tocasse)

## Spec-gaps

nada

## Fora da cobertura

- Cartão do recorte da Adesão (TC-UI-006) — sem pedido com Compre Junto no banco local; criar pedidos excede a Entrada do charter
- Reabrir o protótipo no Claude Design — rodada de confirmação; a régua foi a dos bugs e da tabela D1–D37
- Índice vazio, peça fora do ar, recusas — fora do escopo da confirmação

## Debrief

- **Surpresas:** a massa M-08 não existe mais (apagada no reteste do BUG-013), o que bloqueia a parte "com venda" da Adesão
- **Próximo charter:** se a Adesão com venda precisar de prova final, recriar M-08 temporária antes de uma nova sessão
- **Padrão novo:** nada
