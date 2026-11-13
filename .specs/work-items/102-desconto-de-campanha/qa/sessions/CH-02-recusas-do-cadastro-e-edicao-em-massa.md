# Sessão CH-02 · Recusas do cadastro e a edição em massa — rodada 3 (confirmação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-recusas-do-cadastro-e-edicao-em-massa.md` · exploratório · P1 |
| Status      | done (parcial: o orçamento acabou em TC-UI-004; TC-FUNC-021 sem execução) |
| Persona     | PER-01 Adri · conta: `admin-loja` (conta de dev do seed, seção 5; `QA_ADMIN_LOJA_*` não definidas) |
| Tour · modo | — · rodada de confirmação, sem tour nem edge cases novos               |
| Rodada      | confirmação                                                            |
| Orçamento   | ~28 ações de browser de 25 (contando cada leitura de medida e screenshot), mais 3 para sair da conta. O teto foi passado na tela de edição; a sessão parou aí |
| Ambiente    | http://localhost:8093/admin · build não exposto · Chromium (agent-browser 0.39.1) · viewport 390 × 844 (fonte da raiz a 16 px e a 32 px) |
| Paridade    | `*.supabase.co` e `**/g/collect*` bloqueados por rota; conta de dev local; fonte a 200 % simulada dobrando o `font-size` da raiz (o que o ambiente pede) |

## Missão

Como a dona com pressa, achar qualquer entrada no cadastro de campanha que grave sem motivo ou recuse sem dizer
por quê, qualquer jeito de a marcação em lote numa campanha agendada aparecer na loja antes da hora, e qualquer
lote que o Desfazer não devolva por inteiro.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel pelo celular (390 × 844) e abriu Campanhas | Cartões: Natal · Agendada · 01/12 a 24/12/2026 · 4 peças · selo + pílulas 10 % 15 %; Dia das Mães · Em vigência; Black Friday · Encerrada. Largura do documento 390 = tela; nenhum alvo de toque abaixo de 44 px; nada passando da borda | `screenshots/CH-02-r3-01-lista-campanhas-390.png` |
| 02 | Dobrou a fonte (raiz 32 px) na lista | Os cartões embrulham; largura 390 = tela; nada cortado nem passando da borda | `screenshots/CH-02-r3-02-lista-campanhas-390-fonte200.png` |
| 03 | Abriu "Nova campanha" (sem salvar) em 390 | Uma coluna, prévia abaixo, datas e horas e seletores de cor cabem; largura 390 = tela. Único alvo baixo: o interruptor "Campanha ligada" com 44 × 24 px | `screenshots/CH-02-r3-03-nova-campanha-390.png` |
| 04 | Dobrou a fonte em "Nova campanha" | **O corpo rola de lado**: largura do documento 538 px numa tela de 390. Passam da borda direita: "Adicionar" (até 495 px), "Preto e ouro", "Ardósia e ouro", "Vinho e rosa" e a barra "Cancelar · Salvar campanha" — "Salvar campanha" vai de 248 a 538 px, mais da metade fora da tela. Os campos de hora mostram 90 de 183 px do conteúdo. Reproduzido de novo após recarregar: 538 px | `screenshots/CH-02-r3-04-nova-campanha-390-fonte200.png` |
| 05 | Abriu a edição da Natal (pelo cartão) em 390 | Pílulas "10 % · nenhuma peça · Tirar 10%" e "15 % · 4 peças · Tirar 15%" cabem; largura 390 = tela; o mesmo interruptor 44 × 24 px | `screenshots/CH-02-r3-05-editar-natal-390.png` |
| 06 | Dobrou a fonte na edição da Natal | O corpo rola de lado (538 px): além do que se viu no passo 04, as pílulas com "Tirar 10%" (até 479 px) e "Tirar 15%" (até 439 px) e "Apagar campanha" (até 404 px) passam da borda. Nada foi salvo na Natal | `screenshots/CH-02-r3-06-editar-natal-390-fonte200.png` |
| 07 | Voltou a fonte ao normal, saiu da conta (Sua conta → Sair) e fechou o browser | Voltou a `/admin/login` | — |

**Edge cases tentados:** nada (rodada de confirmação). A massa não foi alterada: nenhum lote aplicado, nada salvo em campanha.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-UI-004 | fail | 01–06 | `screenshots/CH-02-r3-04-nova-campanha-390-fonte200.png` · `screenshots/CH-02-r3-06-editar-natal-390-fonte200.png` | ⇒ A-1. Em 390 com a fonte normal, lista, nova e edição passam (sem rolagem lateral; alvos ≥ 44 px, exceto o interruptor). Com a fonte a 200 %, a lista passa e o formulário (nova e edição) rola de lado. Não conferidos: a aba Preço e estoque da peça, o filtro e a coluna de campanha na lista de produtos em 390, a recusa longa em 390 — orçamento |
| TC-FUNC-021 | skip | — | — | Orçamento esgotado em TC-UI-004. O Desfazer (BUG-007) já foi dado como resolved pelo reteste desta rodada; o entorno (Desfazer devolve marcações e patch de produto juntos) não foi conferido nesta sessão |

Contagem: pass 0 · fail 1 · blocked 0 · skip 1

## Achados

### A-1 · [Campanhas · formulário] Com a fonte a 200 % no celular, o formulário da campanha rola de lado e o "Salvar campanha" fica metade fora da tela — a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-02 (conferir e ajustar a campanha pelo celular) · passos 04 e 06 do log |
| TC                  | TC-UI-004                                                             |
| Gravidade proposta  | medium — Fricção: a dona ainda salva, mas precisa rolar a tela de lado para achar "Salvar campanha", "Adicionar", os presets de cor e o "Tirar {p}%". Abaixo do corte da rodada de confirmação (só regressão ou critical/high): a triagem decide se vira bug ou backlog; registrado porque é a falha de um critério do TC que nunca tinha sido executado |
| Reproduziu          | sim (3 de 3) — "Nova campanha" duas vezes (antes e depois de recarregar) e a edição da Natal |
| Viewport            | 390 × 844, fonte da raiz 32 px                                        |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-loja`, em 390 × 844, abrir `http://localhost:8093/admin/campanhas/nova`
2. Dobrar o tamanho da fonte da raiz da página (16 → 32 px)
3. Olhar a barra "Cancelar · Salvar campanha", o "Adicionar" dos percentuais e os presets de cor; na edição de uma campanha com percentuais, também as pílulas "Tirar {p}%"

**Esperado:** nenhuma rolagem horizontal do corpo com a fonte a 200 %; os botões embrulham ou empilham — **fonte:** TC-UI-004 (PRD CA-15, RN-15; `spec.md` › Painel · Campanhas: abaixo de 1024 px, uma coluna); seção Ambiente do test-plan ("conferir também com a fonte a 200 %… nenhuma rolagem horizontal do corpo"); WCAG 1.4.4/1.4.10.

**Observado:** largura do documento 538 px numa tela de 390 px. Passam da borda direita: "Salvar campanha" (248–538 px), "Adicionar" (até 495 px), "Ardósia e ouro" (até 435), "Vinho e rosa" (406), "Preto e ouro" (404); na edição, também "Tirar 10%" (470), "Tirar 15%" (430) e "Apagar campanha" (404). Os campos de hora mostram 90 dos 183 px do conteúdo. Com a fonte normal, as mesmas telas não rolam de lado; a lista de campanhas, mesmo a 200 %, não rola.

**Evidência:**

- `screenshots/CH-02-r3-04-nova-campanha-390-fonte200.png` — "Nova campanha" a 200 %, com a barra de ações passando da borda
- `screenshots/CH-02-r3-06-editar-natal-390-fonte200.png` — edição da Natal a 200 %, pílulas e ações passando da borda
- `screenshots/CH-02-r3-03-nova-campanha-390.png` — a mesma tela com a fonte normal, sem rolagem (comparação)
- console: não coletado
- rede: não coletado

## Spec-gaps

nada (rodada de confirmação). Sugestões de backlog, sem achado:

- O interruptor "Campanha ligada" tem 44 × 24 px — abaixo dos 44 px de altura do alvo de toque, na nova e na edição (não medido se o rótulo ao lado também liga o interruptor)

## Fora da cobertura

- TC-UI-004: a aba Preço e estoque de uma peça em 390 (passo 4 do TC), o filtro e a coluna de campanha da lista de produtos em 390 e a 200 %, a variação "recusa longa" em 390 — orçamento
- TC-FUNC-021 e o entorno do Desfazer (Natal → 10 % sobre M-G e "Desfazer" do aviso; marcações e patch de produto voltando juntos) — orçamento. A massa ficou intocada: as 4 peças de M-G seguem como entraram (nenhum lote aplicado nesta sessão; a lista filtrada pela campanha não foi reaberta para conferir)
- Fonte a 200 % simulada pelo `font-size` da raiz, não pelo ajuste de fonte do sistema — o que o ambiente define
- Console e rede no passo do achado — não coletados

## Debrief

- **Surpresas:** as telas de campanhas passam em 390 com a fonte normal, mas o formulário (nova e edição) quebra com a fonte a 200 %; a lista não
- **Próximo charter:** sessão curta para TC-FUNC-021 (Desfazer de Natal → 10 % em M-G, conferindo o filtro Natal · 15 % ao sair) e para a lista de produtos e a aba Preço e estoque em 390 / 200 % — o orçamento de 25 não comporta as duas metades com medida a 100 % e a 200 % em cada tela
- **Padrão novo:** medir cada tela também com a fonte a 200 % — a quebra só aparece aí
