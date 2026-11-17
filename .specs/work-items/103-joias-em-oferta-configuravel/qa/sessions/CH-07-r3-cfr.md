# Sessão CH-07 · CFR — o editor do bloco e o bloco na Home (rodada 3)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-cfr.md` · cfr · P1                          |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: admin-loja — `QA_ADMIN_LOJA_*`                    |
| Tour · modo | —                                                                      |
| Rodada      | confirmação (rodada 3 de 3 — BUG-007, fix task 09)                     |
| Orçamento   | 18 ações de browser de 18                                              |
| Ambiente    | painel http://localhost:8083 (worktree store__feature-103) · build não exposto · Chromium (agent-browser) · viewports 390 × 844 e 1440 × 900; fonte da raiz 100 % · 130 % · 200 % |
| Paridade    | Supabase local; `**/*.supabase.co/**` e `**/g/collect*` abortados (fotos do Storage podem faltar — não é achado) |

## Missão

Refazer como auditoria a configuração do bloco e a visita da cliente à Home, procurando onde o editor deixa de ser
usável no celular, com fonte grande ou só pelo teclado, onde o bloco desloca ou estoura a página, e onde um texto
novo quebra o tom memorial.

Nesta rodada: confirmar TC-CFR-001 por inteiro depois da correção do BUG-007 (barra de ações do editor só gruda
enquanto cabe, ≤ 1/4 da janela).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel em 390 × 844 e abrir "Joias em oferta" (B-1); fonte da raiz a 200 % | Editor abre com título, descrição, campanha "Dia das Mães" marcada, P-3 · P-1 · P-2. scrollWidth 390 (sem rolagem lateral). No topo da página a barra (trilha, título, Cancelar, "Salvar seção") tem 345 px | — |
| 02 | Rolar até "Peças escolhidas" a 200 % | A barra de ações **não fica mais grudada**: rola junto com a página (position static, Salvar em y −364). A lista fica com a tela livre | `screenshots/CH-07-r3-04-lista-livre-200.png` |
| 03 | Foco em "Subir a 3ª peça", rolar para baixo e voltar com Shift+Tab (repro do BUG-007) | Foco em "Remover a 2ª peça" em y 378–466, inteiro à vista (o ponto central do controle é o próprio controle, nada por cima); anel de foco 2 px + sombra | `screenshots/CH-07-r3-01-shift-tab-foco-200.png` |
| 04 | Só teclado: Tab do título em diante, 13 vezes | Ordem segue a visual: Descrição → rádio "Dia das Mães" (Natal desabilitado, com o motivo no nome) → Descer/Remover 1ª → Subir/Descer/Remover 2ª → Subir/Remover 3ª → "Acrescentar uma peça" → resultados. Todos os 13 focos visíveis (nenhum coberto). O Salvar fica antes do título, no topo, na ordem visual | — |
| 05 | Enter em "Descer a 1ª peça" | Ordem passa a P-1 · P-3 · P-2; o foco acompanha a peça ("Descer a 2ª peça") | — |
| 06 | Título com 61 caracteres e Enter em "Salvar seção" | Recusa como `role=alert`: "Cabem 60 caracteres no título, e há 61. Encurte o título." Nada salvo (URL continua no editor) | `screenshots/CH-07-r3-02-recusa-61-alerta-200.png` |
| 07 | Cancelar | Volta a `/admin/home` sem salvar | — |
| 08 | Reabrir o editor a 130 % e rolar | Título "Joias para guardar quem a gente ama" e ordem P-3 · P-1 · P-2 — estado do início, intacto. A barra gruda (73–235 px, 162 px ≤ 211 = 1/4 de 844); scrollWidth 390 | `screenshots/CH-07-r3-03-barra-grudada-130.png` |
| 09 | 100 % em 390 × 844; 1440 × 900 a 100 % e a 200 % | 390/100 %: barra grudada com 73 px, sem rolagem lateral. 1440/100 %: grudada, 73 px, scrollWidth 1440. 1440/200 %: não gruda, scrollWidth 1440 | — |
| 10 | De volta a 390 × 844 a 200 %, subir ao topo e rolar 1100 px | Barra continua não grudada; o ponto y 130 é a Descrição, não a barra | `screenshots/CH-07-r3-04-lista-livre-200.png` |
| 11 | Fonte da raiz de volta, sair da conta, fechar | Login em `/admin/login`; sessão fechada | — |

**Edge cases tentados:** fonte a 130 % (variação do TC); Shift+Tab depois de rolar (a repro do BUG-007); 1440 × 900 a 200 %.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-001 | pass | 01–10 | `screenshots/CH-07-r3-01-shift-tab-foco-200.png` · `CH-07-r3-02-recusa-61-alerta-200.png` · `CH-07-r3-03-barra-grudada-130.png` · `CH-07-r3-04-lista-livre-200.png` | BUG-007 corrigido: a 200 % a barra (345 px) não gruda; a 100/130 % gruda por caber. Rótulos: "Título do bloco", "Descrição do bloco", rádios de campanha com nome e motivo, lista com "Subir/Descer/Remover a Nª peça". O editor não desenha vitrine (lista, sem cartão nem foto). Passo 4 do TC (salvar o título original) não foi preciso: a recusa não salvou e o Cancelar descartou — estado de B-1 conferido intacto no passo 08 |
| TC-CFR-002 | skip | — | — | orçamento consumido em TC-CFR-001 (passou na rodada 2) |
| TC-CFR-003 | skip | — | — | orçamento consumido em TC-CFR-001 (passou na rodada 2) |

Contagem: pass 1 · fail 0 · blocked 0 · skip 2

## Achados

nada

## CFR

| Jornada | Categoria             | Marca | Itens que não passaram | Achado |
| ------- | --------------------- | ----- | ---------------------- | ------ |
| J-01    | Usabilidade           | pass  | —                      | —      |
| J-01    | Acessibilidade        | pass  | —                      | —      |
| J-01    | Compatibilidade       | pass  | —                      | —      |
| J-01    | Recuperação de erro   | pass  | — (recusa com motivo, nada salvo, Cancelar descarta) | — |

**Categorias fora:** J-02 inteira e Performance percebida — rodada de confirmação, orçamento só para TC-CFR-001. Paridade: no cabeçalho.

## Spec-gaps

nada

## Fora da cobertura

- TC-CFR-002 e TC-CFR-003 (a Home na loja: reserva de espaço, rede lenta, fonte a 200 % no bloco, tom) — orçamento de 18 ações gasto na confirmação completa de TC-CFR-001; passaram na rodada 2
- Variação "movimento reduzido" de TC-CFR-001 (linha que acende ao salvar) — exigiria salvar B-1; a sessão não salvou para não mexer na massa sem necessidade
- Fonte a 200 % aplicada antes do carregamento da página (a sessão aumentou a raiz com o editor já aberto; logo depois a barra ainda media 345 px grudada no topo, e já na primeira rolagem passou a não grudar) — o comportamento no carregamento inicial não foi medido isoladamente
- Engines além do Chromium

## Debrief

- **Surpresas:** nada
- **Próximo charter:** nada
- **Padrão novo:** nada
