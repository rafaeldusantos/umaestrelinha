# Sessão CH-07 · CFR — o editor do bloco e o bloco na Home

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-cfr.md` · cfr · P1                          |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: `admin-loja` (`QA_ADMIN_LOJA_*`) no painel · `anonima` na loja (sessão separada `CH-07-anon`) |
| Tour · modo | —                                                                      |
| Rodada      | exploração                                                             |
| Orçamento   | 37 ações de browser de 35 na exploração (+7 de saída da conta e fechamento). 6 delas se perderam numa primeira tentativa de login que voltou à tela de login (a espera por URL casou com a própria `/admin/login`) |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 390 × 844; fonte da raiz a 100 %, 130 % e 200 % |
| Paridade    | servidores locais de dev do worktree feature/103 e Supabase local; `*.supabase.co` e `/g/collect` bloqueados (fotos do Storage podem faltar); login por e-mail e senha, o mesmo da dona |

## Missão

Refazer como auditoria a configuração do bloco e a visita da cliente à Home, procurando onde o editor deixa de ser
usável no celular, com fonte grande ou só pelo teclado, onde o bloco desloca ou estoura a página, e onde um texto
novo quebra o tom memorial.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel em 390 × 844 e abrir a Home do painel | Lista com as linhas "Joias em oferta Campanha “Dia das Mães” · em vigência até 30/11 às 23:59", "… “Natal” · agendada — começa em 01/12 às 00:00", "… “QA103 Virada” · encerrada em 17/11". Tom memorial, sem exclamação nem pressa | — (snapshot) |
| 02 | Abrir o editor de B-1 e subir a fonte da raiz a 200 % | Título, descrição, seletor de campanha (rádios com nome), subir/descer/remover por posição, busca "Acrescentar uma peça". **A página rola 151 px de lado** (scrollWidth 541 em 390): a barra do topo com Cancelar + "Salvar seção" não quebra; "Salvar seção" vai de x 248 a x 541 — mais da metade fora da tela | `screenshots/CH-07-01-editor-390-200.png` |
| 03 | Repetir a medida a 130 % e a 100 % | 130 %: sem rolagem (scrollWidth 390), Salvar 162–353, 52 px de altura. 100 %: sem rolagem, Salvar com **40 px de altura** (alvo do ambiente ≥ 44). Botões subir/descer: 44 × 44 a 100 % (88 × 88 a 200 %) | — (valores computados) |
| 04 | Título com 61 caracteres e "Salvar seção" (a 200 %) | Não salvou. Apareceu `alert` com "Cabem 60 caracteres no título, e há 61. Encurte o título." e o indicador "Alterações não salvas" — a recusa é anunciada com o motivo e o próximo passo | — (snapshot) |
| 05 | Cancelar | Voltou à lista sem perguntar; o título não foi gravado (a recusa barrou). B-1 segue "Joias para guardar quem a gente ama" | — (snapshot) |
| 06 | Sair da conta | Menu "Sua conta" → Sair → `/admin/login` | — |
| 07 | Na loja, sem login, Home em 390 × 844 | Um só bloco de oferta ("Joias para guardar quem a gente ama"); nenhum título de "Natal QA" nem de "QA103 Virada" — B-2 e B-3 não ocupam espaço. FCP 404 ms; CLS acumulado 0 (rede rápida). **O corpo rola de lado: scrollWidth 504 a 100 %** (o achado já registrado, 114 px) | — (valores computados) |
| 08 | Fonte da raiz a 200 % na Home | Título do bloco 32–358 px e descrição sem corte; **o corpo rola 178 px de lado** (scrollWidth 568) | `screenshots/CH-07-02-home-390-200.png` |

**Edge cases tentados:** fonte a 130 % no editor (sem rolagem); fonte a 200 % no editor e na Home; recusa com 61 caracteres.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-001 | fail | 02–05 | `screenshots/CH-07-01-editor-390-200.png` | A-1 (rolagem horizontal a 200 %, Salvar meio fora). Passaram: rótulos de título, descrição e campanha; subir/descer com nome por posição; recusa como `alert` com motivo; o editor não desenha vitrine (lista de nomes). Ordem de Tab e foco visível não conferidos (orçamento) |
| TC-CFR-002 | fail | 07–08 | `screenshots/CH-07-02-home-390-200.png` | o corpo rola de lado (114 px a 100 %, 178 px a 200 %) — mesmo sintoma já registrado no CH-02, não reaberto aqui como achado novo. Passaram: B-2 e B-3 sem espaço; título e descrição inteiros a 200 %; CLS 0 em rede rápida. Rede lenta não alcançada |
| TC-CFR-003 | pass | 01, 04 | — | linhas dos três blocos, dica do rádio desabilitado ("Esta campanha já está no 17º bloco da Home, “Natal QA”. Cada campanha tem um bloco só.") e a recusa do título: sem urgência, escassez nem exclamação. Os demais avisos (sem campanha, desligada, peças que saíram, leitura que falhou) não foram provocados nesta sessão |

Contagem: pass 1 · fail 2 · blocked 0 · skip 0

## Achados

### A-1 · [Editor do bloco] com a fonte a 200 % no celular, a barra Cancelar/Salvar estoura a tela e o editor rola de lado

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, salvar o bloco · passo 02 do log                                |
| TC                  | TC-CFR-001                                                            |
| Gravidade proposta  | medium — Adri, com a fonte grande no celular, precisa arrastar a tela de lado para achar o "Salvar seção", que fica com mais da metade fora |
| Reproduziu          | sim (2 de 2 — medida no passo 02 e de novo no 03)                     |
| Viewport            | 390 × 844, font-size da raiz 200 %                                    |

**Passos para reproduzir** — de um estado limpo:

1. Painel `http://localhost:8083/admin/login` como `admin-loja`, viewport 390 × 844
2. `/admin/home` → "Abrir Joias em oferta" (o de "Dia das Mães")
3. Aumentar o font-size da raiz para 200 %

**Esperado:** em 390 px o editor não rola na horizontal e continua usável a 200 %; o Salvar alcançável — **fonte:** PRD RNF-04; TC-CFR-001 passo 1; ambiente ("nenhuma rolagem horizontal do corpo")

**Observado:** `scrollWidth` 541 em `clientWidth` 390 (151 px de rolagem lateral). O que estoura é a barra do topo (`Cancelar` + `Salvar seção`, sem quebra de linha): "Salvar seção" ocupa x 248–541. A 130 % e a 100 % não há rolagem.

**Evidência:**

- `screenshots/CH-07-01-editor-390-200.png` — página inteira do editor a 200 %
- console: nada
- rede: nada

### A-2 · [Editor do bloco] o botão "Salvar seção" tem 40 px de altura no celular, abaixo do alvo de toque

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, salvar o bloco · passo 03 do log                                |
| TC                  | TC-CFR-001                                                            |
| Gravidade proposta  | low — toque um pouco mais difícil na ação principal; ela conclui. Pode ser o cabeçalho comum a todos os editores da Home (então `pré-existente`) — a triagem decide |
| Reproduziu          | sim (2 de 2 — mesma medida em duas leituras)                          |
| Viewport            | 390 × 844, fonte 100 %                                                |

**Passos para reproduzir** — de um estado limpo:

1. Painel como `admin-loja`, 390 × 844, editor de B-1
2. Medir a altura do botão "Salvar seção"

**Esperado:** alvo de toque ≥ 44 px — **fonte:** ambiente do test-plan (Viewport alvo); PRD RNF-04

**Observado:** 40 px de altura a 100 % (52 px a 130 %). Os botões subir/descer medem 44 × 44.

**Evidência:**

- valores computados (`getBoundingClientRect`) — sem screenshot
- console: nada
- rede: nada

## CFR

| Jornada | Categoria             | Marca    | Itens que não passaram | Achado |
| ------- | --------------------- | -------- | ---------------------- | ------ |
| J-01    | Usabilidade           | pass     | — (status "Alterações não salvas"; recusa com motivo e próximo passo; linguagem da dona) | — |
| J-01    | Acessibilidade        | friction | sem quebra a 200 % (editor rola 151 px); alvo de toque do Salvar 40 px | A-1, A-2 |
| J-01    | Performance percebida | pass     | — (recusa no snapshot logo após o clique) | — |
| J-01    | Compatibilidade       | friction | rolagem horizontal a 390 px com fonte a 200 % | A-1 |
| J-01    | Recuperação de erro   | pass     | — (recusa preserva o texto digitado e diz o que fazer) | — |
| J-02    | Usabilidade           | pass     | — | — |
| J-02    | Acessibilidade        | pass     | — (título e descrição inteiros a 200 %) | — |
| J-02    | Performance percebida | pass     | — (FCP 404 ms; CLS 0 em rede rápida) | — |
| J-02    | Compatibilidade       | fail     | o corpo rola de lado em 390 px (114 px a 100 %, 178 px a 200 %) | já registrado no CH-02 (mesma causa observável — não duplicado) |
| J-02    | Recuperação de erro   | pass     | — (sem caminho de falha alcançado) | — |
| —       | Paridade com produção | registrada no cabeçalho | ambiente local; Storage hospedado bloqueado | — |

**Categorias fora:** nada (todas tocadas, algumas parcialmente — ver Fora da cobertura).

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| "Cancelar" com "Alterações não salvas" volta à lista sem perguntar, descartando o que foi digitado | 05 | polimento |
| Os três blocos "Joias em oferta" têm interruptores com o mesmo nome acessível ("Desligar Joias em oferta"); o mesmo acontece com "Grade de banners" | 01 | pré-existente |

## Fora da cobertura

- Rede lenta na Home (TC-CFR-002 passo 1) — o `agent-browser` não atrasa resposta; CLS medido só em rede rápida
- Só teclado: ordem de Tab, foco visível no seletor e em subir/descer, mover peça pelo teclado — orçamento
- Movimento reduzido na fileira e na linha que acende ao salvar — orçamento
- 320 × 568 e 1440 × 900 (editor e Home) — orçamento
- Salvar o título com " teste" e devolver (massa do charter) — não feito: a recusa com 61 caracteres não grava, e o Cancelar devolveu o estado; B-1 não foi alterado
- Avisos do editor não provocados (sem campanha, desligada, peças que saíram, que não barateiam, leitura que falhou) e a frase dos percentuais com a descrição vazia — orçamento
- Leitor de tela real, outros engines (Safari, Firefox) — fora do alcance do browser da sessão

## Debrief

- **Surpresas:** a 130 % o editor cabe; só a 200 % a barra do topo estoura — o resto do editor quebra bem
- **Próximo charter:** só teclado e movimento reduzido no editor, que não couberam
- **Padrão novo:** medir a barra de ações fixa do topo com a fonte da raiz a 200 % — é onde o layout não quebra linha
