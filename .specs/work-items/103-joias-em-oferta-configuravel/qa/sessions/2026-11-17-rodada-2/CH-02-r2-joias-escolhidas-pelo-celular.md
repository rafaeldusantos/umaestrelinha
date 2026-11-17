# Sessão CH-02 · Achar as joias escolhidas pelo celular — rodada 2 (confirmação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-joias-escolhidas-pelo-celular.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Marina · conta: anonima                                         |
| Tour · modo | Feature · com tour (confirmação: só os TC e o entorno da correção)     |
| Rodada      | confirmação                                                            |
| Orçamento   | 25 ações de browser de 25 (+ o `close` de limpeza)                     |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, `--session CH-02-r2`) · viewports 390 × 844 · 1440 × 900 |
| Paridade    | rotas abortadas pelo ambiente: `**/*.supabase.co/**` (fotos do Storage hospedado — não é achado) e `**/g/collect*` |

## Missão

Confirmar que quem nunca abriu a loja, pelo celular, encontra o bloco "Joias em oferta", entende pelo título, pela
descrição e pelo selo que há desconto, passa pelas peças que a dona escolheu — na ordem dela — e chega à página de
uma delas com o preço da campanha, sem a página pular nem rolar de lado.

Nesta rodada: só TC-UI-001 (correção do BUG-003 — o corpo rolava 114 px de lado em 390) e TC-FUNC-008 (passos 3–4 e
a largura de 1440, sem veredito na rodada 1).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir a Home em 390 × 844, sem login, e descer até o bloco | Selo "DIA DAS MÃES" acima do título "Joias para guardar quem a gente ama"; descrição "Peças com leite materno e coto umbilical, feitas à mão no ateliê, com o desconto do Dia das Mães."; cartões "10% de desconto · Ver as peças" e "15% de desconto · Ver as peças"; "Algumas das peças em oferta", "Ver todas", setas Anterior/Próximo; peças P-3 (Colméia, 15 %, De R$ 339,90 por R$ 288,92), P-1 (6 Corações, 15 %, De R$ 329,90 por R$ 280,42), P-2 (Amor Mãe e Bebê, 10 %, De R$ 359,90 por R$ 323,91) — nessa ordem e só elas | — (snapshot) |
| 02 | (medição) a largura da página com o bloco na tela | `document.documentElement.scrollWidth` = 390 para `clientWidth` = 390; `body.scrollWidth` = 390 | — (valor computado) |
| 03 | Passar a fileira pela seta "Próximo" até o fim e tentar arrastar a página de lado | A fileira andou (scrollLeft 244, depois 350 de 350 — fim, com P-2 inteira na tela). Com a fileira no fim, `scrollWidth` do documento = 390 e, após `scrollBy(300,0)` na janela, `scrollX` = 0 e `body.scrollLeft` = 0: o corpo não rola de lado. BUG-003 não reaparece | `screenshots/CH-02-r2-01-fileira-passada-390.png` |
| 04 | Abrir a mesma Home em 1440 × 900 | `scrollWidth` 1440 = janela. As três peças lado a lado numa só linha (y = 468; x = 96, 340, 584; 220 px cada) — fita, não grade; setas "Anterior" e "Próximo" presentes junto de "Ver todas". Com só 3 peças, a fita cabe inteira, sem nada a rolar. Selo, título, descrição e os dois cartões iguais aos de 390 | `screenshots/CH-02-r2-02-fita-1440.png` |
| 05 | Em 1440, com a leitura de produtos bloqueada (`**/rest/v1/products*` abortada), recarregar a Home | A Home fica de pé: cabeçalho, outros blocos, rodapé; nenhuma mensagem de erro na tela; `scrollWidth` 1440. O bloco mostra o selo, o título, a descrição e os dois cartões de percentual. Nenhuma peça. Logo após o recarregar, o trecho "Algumas das peças em oferta" + "Ver todas" + setas continuava na tela, com vagas em esqueleto (sem cartão de peça) — não deu para ver se as vagas somem depois (o orçamento acabou aqui) | `screenshots/CH-02-r2-03-sem-produtos-1440.png` |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-UI-001 | pass | 02–04 | `screenshots/CH-02-r2-01-fileira-passada-390.png` · `screenshots/CH-02-r2-02-fita-1440.png` | passo 2: corpo sem rolagem lateral em 390 com a fileira no fim (scrollWidth 390, scrollX 0) — BUG-003 corrigido; passo 3: fita com setas em 1440. Passo 1 (rede lenta) fora do alcance do agent-browser — Fora da cobertura |
| TC-FUNC-008 | pass | 01, 04, 05 | `screenshots/CH-02-r2-03-sem-produtos-1440.png` | passos 1–2 (390 e 1440): selo, título, descrição, cartões, "Ver todas", P-3, P-1, P-2. Passo 3: a Home e os cartões de percentual ficam de pé, sem erro na tela (RNF-02). Ressalva: no instante medido, a área da fileira mostrava o título "Algumas das peças em oferta" e vagas em esqueleto, não "sem a fileira" — não deu para ver se é estado final ou nova tentativa de leitura (orçamento). Passo 4 (tirar o bloqueio e recarregar) não foi executado: orçamento; o estado do passo 2 já tinha sido visto no passo 01/04 antes do bloqueio |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-UI-001 passo 1 (rede lenta, contar as vagas de esqueleto e o deslocamento do rodapé) — o `agent-browser` não atrasa resposta
- TC-FUNC-008 passo 3, parte "sem a fileira": com produtos bloqueados a área da fileira estava em esqueleto logo após o recarregar; não houve orçamento para esperar e ver se as vagas somem ou ficam presas no esqueleto. Vale uma conferência curta (bloquear, recarregar, esperar ~10 s, olhar a área)
- TC-FUNC-008 passo 4 (tirar o bloqueio e recarregar) — orçamento esgotado; o bloqueio morreu com o fechamento do browser

## Debrief

- **Surpresas:** com a leitura de produtos abortada, o cabeçalho da fileira e as setas continuam na tela com esqueletos (ao menos nos primeiros instantes)
- **Próximo charter:** a conferência do esqueleto persistente com produtos bloqueados (acima)
- **Padrão novo:** nada
