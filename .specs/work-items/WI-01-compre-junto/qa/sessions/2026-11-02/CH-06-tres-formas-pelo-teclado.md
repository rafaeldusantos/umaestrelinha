# Sessão CH-06 · As três formas do bloco pelo teclado, indo e voltando

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-tres-formas-pelo-teclado.md` · exploratório · P1 |
| Status      | done (parcial: orçamento esgotado antes do tour Back-Button e da folha em 390) |
| Persona     | PER-03 Helena · conta: anonima (loja); a troca de forma usou `admin-painel` (`QA_ADMIN_PAINEL_*`) num contexto isolado, como preparação |
| Tour · modo | Back-Button · com tour (o tour em si não foi alcançado — ver Fora da cobertura) |
| Rodada      | exploração                                                             |
| Orçamento   | 52 ações de browser de 50 (as duas últimas: troca/restauração da forma e fechar o browser) |
| Ambiente    | http://localhost:8082 (loja) · http://localhost:8083 (painel) · build não exposto (dev server) · Chromium headless (Playwright MCP) · viewport 720 × 450 |
| Paridade    | zoom 200% em 1440 × 900 simulado por viewport 720 × 450 (mesma largura CSS); o ponto de partida do foco em cada rodada foi posto por script na caixa do A1 (ou no CTA "Levar o conjunto"), dali em diante só teclado; a rodada "Com fórmula" correu num único script Playwright (teclado: foco, Space, Enter) para caber no orçamento; *.supabase.co e /g/collect bloqueados por rota |

## Missão

Confirmar que, só com o teclado, a cliente monta o mesmo conjunto nas três formas, que a folha e o diálogo nunca prendem nem perdem o foco, e que voltar no navegador não deixa folha presa nem marca fantasma.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Forma "Na linha" (a gravada). Abriu M-01, foco na caixa "Levar junto: QA Correntes", Space | A1 marcado; abre ali mesmo "Escolha a peça · 2 modelos" com o status "Escolha a peça."; botão "Esconder opções"; total R$ 259,90 / R$ 241,71 no Pix | — |
| 02 | Com A1 incompleto, foi ao CTA da barra ("Levar o conjunto") e apertou Enter | Alerta "Falta uma escolha em 1 peça. Ela está marcada acima."; foco foi para o botão "Esconder opções" do A1; nada entrou na sacola (botão "Sacola" sem contagem) | — |
| 03 | Tab, Space na peça → "QA Corrente Veneziana" | Escolhida; aparece "Comprimento" (40 · 45 · 50 desabilitado) e o status **"Escolha o Comprimento da QA."** | — |
| 04 | Tab + Space (achando que seguia), Tab + Space | Cada opção de comprimento é uma parada de Tab; o segundo Space trocou 40 cm por **45 cm**. Caixa passa a "Levar junto: QA Correntes, QA Corrente Veneziana, 45 cm"; total R$ 354,80 / R$ 329,96 Pix (259,90 + 94,90; × 0,93 = 329,964) | `screenshots/CH-06-01-na-linha-720.png` |
| 05 | Preparação: no painel (`admin-painel`, contexto isolado), "Em folha", salvar, recarregar | "Em folha" marcada após recarregar | — |
| 06 | Recarregou M-01; os controles do bloco | Cada adicional: caixa "Levar junto: …" + botão "Ver os 2 modelos"/"Ver opções" com `aria-haspopup=dialog` | — |
| 07 | Tab até "Ver os 2 modelos", Enter | Abre diálogo nomeado pelo título "QA Correntes" (aria-labelledby); **foco no título**; "Incluir no conjunto" desabilitado; status "Escolha a peça."; o diálogo cabe em 720 × 450 | `screenshots/CH-06-02-em-folha-dialogo-720.png` |
| 08 | Esc sem completar | Fecha (após a animação); foco volta a "Ver os 2 modelos"; A1 **não** marcado | — |
| 09 | Enter de novo; Tab, Tab, Space (Veneziana) | Foco volta ao título ao reabrir; Comprimento aparece; status de novo "Escolha o Comprimento da QA."; "Incluir" ainda desabilitado | — |
| 10 | Tab, Space (40 cm) | "Incluir no conjunto" habilita | — |
| 11 | Tab (achando que ia ao "Incluir"), Enter | O Tab caiu em "45 cm" e o Enter escolheu 45 cm; diálogo segue aberto | — |
| 12 | Tab, Enter em "Incluir no conjunto" | Diálogo fecha; foco volta a "Ver os 2 modelos"; A1 marcado "Levar junto: QA Correntes, QA Corrente Veneziana, 45 cm"; total R$ 354,80 / R$ 329,96 Pix — igual ao de "Na linha" | — |
| 13 | Preparação: painel → "Com fórmula", salvar; M-01 numa página nova (720 × 450) | Faixa "Esta joia + QA Correntes + QA Berloque Coração + QA Medalha Afetiva" num ancestral com `aria-hidden="true"`; os três adicionais da faixa estão na lista | — |
| 14 | Foco no A1, Space; foco no CTA "Levar o conjunto", Enter | A faixa não muda de texto ao marcar; alerta "Falta uma escolha em 1 peça. Ela está marcada acima." — o mesmo de "Na linha"; foco em "Esconder opções"; total R$ 259,90 / R$ 241,71 | `screenshots/CH-06-03-com-formula-incompleto-720.png` |
| 15 | Preparação: painel → "Na linha", salvar, recarregar | "Na linha" marcada após recarregar — **forma restaurada** | — |

**Edge cases tentados:** só teclado a partir do bloco (passos 01–14); zoom 200% equivalente com o diálogo aberto (passo 07: cabe e "Incluir no conjunto" é alcançável por Tab); reabrir o diálogo depois de Esc (passo 09).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-024 | pass | 06–12 | `screenshots/CH-06-02-em-folha-dialogo-720.png` | Diálogo no computador: foco no título, Esc fecha e devolve o foco, sem marca fantasma, "Incluir" só com a escolha completa, total atualiza. Não feito: folha em 390 e as variações clique fora / voltar do navegador (orçamento) |
| TC-FUNC-025 | skip | 13–14 | `screenshots/CH-06-03-com-formula-incompleto-720.png` | Faixa presente, fora da árvore (`aria-hidden`), e nada dela falta na lista. Não conferido por Tab: a leitura do DOM contou 3 elementos potencialmente focáveis dentro do subárvore da faixa — pista, não reproduzida (orçamento). A faixa não mudou de texto ao marcar A1 (variação "reflete a marca" sem conclusão: pode refletir por estilo) |
| TC-FUNC-026 | skip | 02, 04, 12, 14 | — | Parcial: mesma mensagem, mesmo foco e mesmo bloqueio com A1 incompleto em "Na linha" e "Com fórmula"; mesmo total e Pix (R$ 354,80 / R$ 329,96) em "Na linha" e "Em folha". Não alcançados: incompleto em "Em folha", gravação acima do limite, levar à sacola, variação "Chaveiro" (orçamento) |

Contagem: pass 1 · fail 0 · blocked 0 · skip 2

## Achados

### A-1 · [Bloco Compre Junto, as três formas] Cada opção de um grupo de escolha é uma parada de Tab, e Space/Enter troca a escolha — a cliente de teclado muda o comprimento sem querer

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Helena                                                         |
| Jornada e passo     | J-04, passo 3 (escolher a variação) · passos 04 e 11 do log           |
| TC                  | TC-FUNC-024                                                           |
| Gravidade proposta  | low — ela conclui, mas sai com outro comprimento se não reler o rótulo da caixa; o rótulo anuncia a escolha final |
| Reproduziu          | sim (2 de 2: "Na linha" e "Em folha")                                 |
| Viewport            | 720 × 450 (1440 × 900 a 200%)                                         |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia, forma "Em folha", http://localhost:8082/produtos/qa-pingente-estrela
2. Tab até "Ver os 2 modelos", Enter; Tab, Tab, Space (QA Corrente Veneziana); Tab, Space (40 cm)
3. Tab (para seguir ao "Incluir no conjunto"), Enter

**Esperado:** um grupo de opções (`radiogroup`) é uma parada de Tab só; as setas trocam a opção, e o Tab sai do grupo — **fonte:** padrão de grupo de rádio do WAI-ARIA APG (o PRD CA-09.5 pede o bloco operável pelo teclado, sem detalhar o padrão)

**Observado:** o Tab vai de "40 cm" para "45 cm" (cada opção é um botão com sua parada de Tab); o Enter escolhe 45 cm e o diálogo segue aberto. Em "Na linha" o mesmo: Tab + Space trocou 40 cm por 45 cm.

**Evidência:**

- passo 11 (estado lido: foco em "45 cm", 45 cm marcado, diálogo aberto); passo 04 (caixa "Levar junto: QA Correntes, QA Corrente Veneziana, 45 cm")
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O status de escolha faltando diz "Escolha o Comprimento da QA." — o nome da peça parece cortado na primeira palavra ("QA Corrente Veneziana" → "QA"); com peças reais viraria "da Corrente". Nenhuma fonte define o texto | 03, 09 | polimento |
| Na "Com fórmula", a faixa não muda de texto ao marcar um adicional (lista os três sempre); o TC espera que "reflita a marca", sem dizer como | 14 | polimento |

## Fora da cobertura

- Tour Back-Button: voltar/avançar do navegador com o diálogo aberto, voltar depois de "Levar o conjunto", recarregar com a folha aberta — orçamento esgotado.
- Folha em 390 × 844 (e fonte a 200%) — orçamento.
- TC-FUNC-024 variação "clique fora" — orçamento (e fora da persona, que não usa mouse).
- TC-FUNC-025, passo 2 por Tab: confirmar se algum dos 3 elementos contados dentro do subárvore `aria-hidden` da faixa recebe foco — pista não reproduzida.
- TC-FUNC-026: incompleto em "Em folha", gravação acima do limite, levar à sacola nas três formas, variação "Chaveiro" — orçamento.
- Abrir o produto numa aba nova com "Em folha"; movimento reduzido ao abrir/fechar a folha — orçamento.
- Leitor de tela real — fora do browser da sessão.
- Saída da conta `admin-painel`: não houve logout pelo botão; o contexto isolado em memória foi descartado ao fechar o browser.

## Debrief

- **Surpresas:** cada opção de rádio é uma parada de Tab — o mesmo gesto que a persona usa para "seguir" troca a escolha.
- **Próximo charter:** repetir CH-06 só com o tour Back-Button e a folha em 390 (o que esta sessão não alcançou), com orçamento próprio.
- **Padrão novo:** "Tab + Space para seguir" dentro de grupos de escolha — achou A-1.
