# Reteste — WI 103 · rodada 3 (confirmação)

| Campo      | Valor                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Rodada     | 2026-11-17 · início 02:18 · fim 02:23                                                                   |
| Ambiente   | painel http://localhost:8083 (worktree store__feature-103, depois da fix task 09, commit 656bb5ce) · build `não exposto` · Chromium headless (agent-browser 0.39.1, sessão `retest`) |
| Bugs lidos | 1 de `issues/` com status `open` (BUG-007). BUG-001 a BUG-006 já estavam `resolved` e não foram retestados |

Contagem: resolved 1 · still-open 0 · cannot-reproduce 0 · blocked 0

As rotas `**/*.supabase.co/**` e `**/g/collect*` ficaram abortadas na sessão inteira. A fonte foi aumentada no font-size da raiz (100 % = 16 px, 130 % = 20,8 px, 200 % = 32 px), sem zoom. Cada medida foi lida depois do quadro seguinte à troca de fonte ou de janela. Na mesma leitura síncrona da troca, a barra ainda mostra o estado anterior por um quadro. Isso é o tempo da observação, e não um estado preso (ver o entorno 3).

## BUG-007 · [Editor do bloco] A 200 % no celular, a barra fixa do topo cobre a lista de peças e o foco

| Campo      | Valor                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Resultado  | resolved                                                               |
| Persona    | PER-01 Adri, na condição do CFR (fonte a 200 %) · conta: admin-loja-2 (QA_ADMIN_LOJA_2_*) |
| Passos de  | `issues/BUG-007.md`                                                    |
| Tentativas | 2 · 2                                                                  |
| Viewport   | 390 × 844, fonte da raiz a 200 % (entorno: 100 %, 130 %, 1440 × 900 e 844 × 390) |

**Passos seguidos.** Partem de um estado limpo, como estão no bug:

1. Login no painel a 390 × 844. Abrir Loja → Home → "Abrir Joias em oferta" (B-1, 4º bloco). B-1 tem "Dia das Mães" e P-3, P-1 e P-2, nessa ordem
2. Pôr a fonte da raiz a 200 %
3. Rolar até "Peças escolhidas"
4. Pelo teclado: pôr o foco em "Subir a 3ª peça", rolar a página para baixo e apertar Shift+Tab (e mais duas vezes)
5. Pelo toque: centrar "Remover a 1ª peça" na tela (y 378–466) e tocar no centro dele (x 330, y 422). Na 2ª tentativa, o mesmo com "Remover a 2ª peça". Depois, Cancelar, sem gravar

**Esperado:** com a fonte do sistema a 200 % no celular, o editor continua usável. O controle que recebe o foco fica à vista. A barra fixa não cobre o conteúdo de um jeito que faça o toque num controle das peças ir para outro botão.

**Observado** (igual nas duas tentativas):

- A 200 %, a barra do editor (Cancelar e "Salvar seção") deixa de grudar no topo: `position: static`, 345 px, mais alta que 1/4 da janela (211 px). Ao rolar, ela sai da tela junto com o conteúdo. Só o cabeçalho do painel continua fixo, em y 0–112 (13 % da tela, eram 54 %).
- **Teclado:** com Shift+Tab, o foco vai de "Subir a 3ª peça" para "Remover a 2ª peça", depois "Descer a 2ª peça" e "Subir a 2ª peça". Todos ficam em y 378–466, à vista, e o próprio botão é o que está no ponto central. Na rodada 2, "Remover a 2ª peça" ficava debaixo da barra.
- **Toque:** os 7 controles ativos das três peças, centrados na tela, recebem o próprio toque. O toque em "Remover a 1ª peça" tirou P-3 do rascunho. O cabeçalho passou a "Alterações não salvas", com "2 de 12", e sem "Salvo". O toque em "Remover a 2ª peça" tirou P-1 do mesmo jeito. Nada foi gravado, e os dois rascunhos foram descartados com Cancelar. Na rodada 2, esse toque caía no "Salvar seção".
- O documento mede 390 px a 100 %, 130 % e 200 %, e a rolagem lateral do BUG-004 não volta.

**Entorno:**

| Onde                      | Resultado    | Nota |
| ------------------------- | ------------ | ---- |
| Passo anterior da jornada | ok           | Título, descrição e campanha a 200 % ficam sem cobertura. Dos 64 focáveis do editor testados, 63 ficam à vista ao receber foco |
| Passo seguinte da jornada | ok           | A 200 %, a dona reordenou (desceu a 1ª peça), subiu ao topo e clicou "Salvar seção". Deu "Salvo", sem "Alterações não salvas". Depois, a mesma coisa para devolver a ordem. Ao recarregar: P-3, P-1, P-2 |
| Mesma ação com outro dado | quebra (N-1) | Shift+Tab da lista de resultados para o campo "Acrescentar uma peça" deixa o campo em y 0–80, inteiro debaixo do cabeçalho do painel (0–112). Não é a barra do editor (ver N-1) |
| (1) 100 % e 130 %, 390 × 844 | ok        | A 100 %, a barra gruda em y 56–129 (73 px), com "Salvar seção" em x 219–366. A 130 %, gruda em y 73–235 (162 px), com "Salvar seção" em x 162–353. O botão fica inteiro, e o documento mede 390 px |
| (1) 1440 × 900            | ok           | A 100 %, a barra gruda no topo da coluna rolável (y 24–97, 73 px), com "Salvar seção" em x 454–640. A 130 %, gruda com 95 px. A 200 %, mede 249 px, acima do limite de 225, e não gruda: é a regra nova, e o "Salvar seção" fica no topo do formulário |
| (2) 200 %, editor de "Produtos em destaque" | quebra (N-2) | A barra não gruda (345 px), e o "Salvar seção" fica inteiro em x 48–342. O documento rola de lado: 539 px |
| (2) 200 %, /admin/cupons/novo | quebra (N-3) | A barra não gruda (345 px), e o "Salvar cupom" fica inteiro em x 48–355. Os 20 focáveis ficam à vista. O documento rola de lado: 448 px |
| (2) 200 %, /admin/promocoes/nova | quebra (N-4) | A barra não gruda (345 px). O "Salvar promoção" passa da borda (x 48–398). O documento rola de lado: 605 px |
| (3) Girar e redimensionar sem recarregar | ok | Duas sequências, 390 × 844 ↔ 844 × 390 ↔ 1440 × 900 com 100 %, 130 % e 200 % alternados. O estado sempre acompanha a altura atual contra 1/4 da janela. Exemplos: 390 × 844 a 200 %, 345 px, não gruda. 844 × 390 a 200 %, 145 px contra limite de 98, não gruda. 844 × 390 a 100 %, 73 px, gruda. 844 × 390 a 130 %, 95 px contra 98, gruda, e os controles das peças ficam livres. De volta a 390 × 844 a 100 %, gruda. Nenhum estado ficou preso |

**Evidência:**

- `screenshots/retest-r3-BUG-007.png`: a 390 × 844 com fonte 200 %, o foco em "Remover a 2ª peça" à vista depois do Shift+Tab, sem barra por cima
- `screenshots/retest-r3-BUG-007-toque-remove.png`: depois do toque em "Remover a 1ª peça", a peça sai do rascunho ("2 de 12", "Alterações não salvas"), sem gravar
- `screenshots/retest-r3-BUG-007-2.png`: 2ª tentativa, depois do toque em "Remover a 2ª peça"
- `screenshots/retest-r3-BUG-007-salvar-200.png`: o "Salvo" depois de gravar a reordenação a 200 %
- `screenshots/retest-r3-BUG-007-390-100-gruda.png` e `screenshots/retest-r3-BUG-007-390-130-gruda.png`: a barra grudada no topo a 100 % e a 130 % no celular
- `screenshots/retest-r3-BUG-007-1440-100-gruda.png`: a barra grudada no topo da coluna a 1440 × 900
- console: `nada` · rede: `nada`

**Massa:** B-1 foi reordenado (P-1, P-3, P-2), gravado e devolvido a P-3, P-1, P-2, e gravado de novo. Depois de recarregar, tem título "Joias para guardar quem a gente ama", a descrição original, "Dia das Mães" e P-3, P-1, P-2, nessa ordem. A linha em /admin/home segue ligada, "em vigência até 30/11", com "18 seções · 10 no ar". Nada foi gravado em "Produtos em destaque", no cupom ou na promoção: os três foram só abertos, sem "Alterações não salvas".

## Achados novos no entorno

### N-1 · [Editor do bloco] A 200 % no celular, o cabeçalho do painel cobre o campo "Acrescentar uma peça" ao voltar com Shift+Tab — quem usa teclado com fonte grande

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Perto de            | BUG-007                                                               |
| Persona             | PER-01 Adri (condição do CFR, 200 %)                                  |
| Jornada e passo     | J-01, passo de acrescentar peça às peças escolhidas                   |
| Gravidade proposta  | medium. Fricção: a dona digita num campo que não vê. Os resultados aparecem logo abaixo, e ela conclui. Só a 390 com fonte a 200 % |
| Reproduziu          | sim (3 de 3 a 200 %; 0 a 100 % e a 130 %; 0 a 1440 × 900)            |

**Passos para reproduzir.** Partem de um estado limpo:

1. A 390 × 844, abrir o editor de B-1 e pôr a fonte da raiz a 200 %
2. Pôr o foco no primeiro resultado ativo da lista abaixo de "Acrescentar uma peça" ("Anel Afetivo Aliança com Coto Umbilical em Prata 925")
3. Rolar até o campo "Acrescentar uma peça" ficar logo acima da tela, e apertar Shift+Tab

**Esperado:** o campo que recebe o foco fica à vista, sem ser coberto por conteúdo fixo. **Fonte:** PRD RNF-04 · TC-CFR-001 passo 2 ("foco visível") · WCAG 2.2 2.4.11.

**Observado:**

- O foco vai para o campo, que para em y 0–80, inteiro debaixo do cabeçalho fixo do painel (y 0–112). No ponto central do campo está o cabeçalho.
- O documento não tem `scroll-padding-top`.
- Não é a barra do editor, que agora não gruda a 200 %. É o cabeçalho do painel, que já estava na conta de 457 px do BUG-007.
- No editor de "Produtos em destaque", a leitura com `focus()` deu o mesmo com dois itens da lista de produtos: um em y 0 e outro em y 87, também sob o cabeçalho.

**Evidência:** `screenshots/retest-r3-BUG-007-busca-sob-cabecalho-200.png`: o campo com foco escondido sob o cabeçalho do painel.

### N-2 · [Editor "Produtos em destaque"] A 200 % no celular, a página rola de lado — quem usa fonte grande

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Perto de            | BUG-007 (entorno 2, mesmo `FormPageHeader`)                           |
| Persona             | PER-01 Adri (condição do CFR, 200 %)                                  |
| Jornada e passo     | fora das jornadas do WI 103: editar outro bloco da Home              |
| Gravidade proposta  | medium. Fricção, a mesma classe do BUG-004. A superfície está fora do WI 103 e o defeito não nasce do commit 656bb5ce. É candidato a backlog |
| Reproduziu          | sim (2 de 2)                                                          |

**Passos para reproduzir.** Partem de um estado limpo:

1. A 390 × 844, em /admin/home, "Abrir Produtos em destaque" (o 1º), e pôr a fonte da raiz a 200 %

**Esperado:** nenhuma rolagem horizontal do corpo a 390 px. **Fonte:** ambiente do test-plan ("nenhuma rolagem horizontal do corpo") · PRD RNF-04.

**Observado:**

- O documento mede 539 px.
- O transbordo vem de dois textos de ajuda que não quebram linha (`shrink-0`): "6 de 12 · arraste para trocar de ordem" (x 121–539) e "no celular, 2 por linha na grade" (x 121–459).
- A barra do editor está certa: não gruda, e o "Salvar seção" fica inteiro.

**Evidência:**

- `screenshots/retest-r3-BUG-007-produtos-destaque-rola-lado-200.png`: a página deslocada 149 px para o lado, com o texto transbordando
- `screenshots/retest-r3-BUG-007-produtos-destaque-200.png`: o topo do editor a 200 %

### N-3 · [Novo cupom] A 200 % no celular, o seletor de tipo de desconto faz a página rolar de lado — quem usa fonte grande

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Perto de            | BUG-007 (entorno 2, mesmo `FormPageHeader`)                           |
| Persona             | PER-01 Adri (condição do CFR, 200 %)                                  |
| Jornada e passo     | fora das jornadas do WI 103: criar cupom                              |
| Gravidade proposta  | medium. Fricção: "Frete grátis" fica parte fora da tela. Superfície fora do WI 103, e o defeito não nasce do commit 656bb5ce |
| Reproduziu          | sim (2 de 2; 390 px a 100 % e a 130 %)                               |

**Passos para reproduzir.** Partem de um estado limpo:

1. A 390 × 844, abrir /admin/cupons/novo e pôr a fonte da raiz a 200 %

**Esperado:** nenhuma rolagem horizontal do corpo a 390 px. **Fonte:** ambiente do test-plan · PRD RNF-04.

**Observado:**

- O documento mede 448 px.
- O transbordo vem do seletor "% off · Valor fixo · Frete grátis" (`w-fit`, x 97–448). O botão "Frete grátis" fica em x 321–443.
- A barra do formulário está certa: não gruda (345 px), e o "Salvar cupom" fica inteiro.

**Evidência:** `screenshots/retest-r3-BUG-007-cupom-rola-lado-200.png`: o seletor de tipo passando da borda.

### N-4 · [Nova promoção] A 200 % no celular, "Salvar promoção" passa da borda e a página rola de lado — quem usa fonte grande

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Perto de            | BUG-007 (entorno 2, mesmo `FormPageHeader`) e BUG-004                 |
| Persona             | PER-01 Adri (condição do CFR, 200 %)                                  |
| Jornada e passo     | fora das jornadas do WI 103: criar promoção                           |
| Gravidade proposta  | medium. Fricção: o botão de salvar fica cortado 8 px e a página rola de lado. Superfície fora do WI 103. O corte do botão está no `FormPageHeader` (o rótulo "Salvar promoção ⌘S" a 200 % é mais largo que a faixa), e não na regra de grudar do commit 656bb5ce |
| Reproduziu          | sim (2 de 2 a 200 %; também a 130 %, 401 px)                         |

**Passos para reproduzir.** Partem de um estado limpo:

1. A 390 × 844, abrir /admin/promocoes/nova e pôr a fonte da raiz a 200 %
2. Olhar a barra do topo e a seção de alcance da promoção

**Esperado:** "Salvar promoção" inteiro na tela e nenhuma rolagem horizontal do corpo a 390 px. **Fonte:** ambiente do test-plan · PRD RNF-04 · o esperado do BUG-004 aplicado ao mesmo cabeçalho.

**Observado:**

- A 200 %, o documento mede 605 px.
- "Salvar promoção" ocupa x 48–398, 8 px além da borda.
- Também transbordam o seletor "Toda a loja · Categorias · Produtos · em breve" (x 97–577) e o select "+ Adicionar categoria" (x 97–605).
- A 130 %, o documento mede 401 px, pelo select. A barra fica com 225 px e não gruda.
- A 100 %, o documento mede 390 px.
- A 1440 × 900, nada transborda.

**Evidência:**

- `screenshots/retest-r3-BUG-007-promocao-salvar-200.png`: o topo com "Salvar promoção" cortado na borda
- `screenshots/retest-r3-BUG-007-promocao-rola-lado-200.png`: o seletor de alcance passando da borda
