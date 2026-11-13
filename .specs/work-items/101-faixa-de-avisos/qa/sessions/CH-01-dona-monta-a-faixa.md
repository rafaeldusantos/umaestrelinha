# Sessão CH-01 · A dona monta a faixa da Black Friday (rodada 2, confirmação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-dona-monta-a-faixa.md` · exploratório · P0  |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*`                  |
| Tour · modo | Feature · por cenário (J-01) — nesta rodada, só conferência de TC      |
| Rodada      | confirmação                                                            |
| Orçamento   | 30 ações de browser de 25. O teto caiu na volta à massa (recarregar e conferir A1..A4 com a faixa ligada, passos 08–09), que o briefing manda fazer ao fim. Sair da conta custou mais 3. Rotas, viewport e esperas não entram na conta |
| Ambiente    | painel http://localhost:8083/admin/faixa-de-avisos · loja http://localhost:8082 na prévia · build não exposto (worktree HEAD f649a843, segundo o briefing) · Chromium headless (agent-browser 0.39.1) · viewport 1440 × 900 (o charter diz que o painel não se confere em 390) |
| Paridade    | Supabase local. `*.supabase.co` e `**/g/collect*` abortados por rota. Massa pré-gravada (faixa ligada, A1..A4) |

## Missão

Confirmar que a Adri, sozinha e sem ajuda, monta os quatro avisos da Black Friday, confere a prévia e põe a faixa no ar, e que o que ela salvou é o que a loja mostra.

Nesta rodada a sessão confere só o TC-FUNC-002 (o fix do BUG-001) e o TC-FUNC-005, tudo em rascunho e sem salvar.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel e abrir a Faixa de avisos | "Faixa ligada" marcado. A lista na ordem A1, A2, A3, A4. "4 de 5". "Subir o aviso 1" e "Descer o aviso 4" desabilitados. Salvar desabilitado | — |
| 02 | "Descer o aviso 1"          | O A2 virou o primeiro e o A1 o segundo. "Subir o aviso 1" ficou desabilitado no novo primeiro. Apareceu "Alterações não salvas." e o Salvar habilitou. A prévia, em "Aviso 1 de 4", passou a mostrar o A2 ("10%, 15% e 20% de desconto · … · Ver as peças") | `screenshots/CH-01-r2-03-descer-a1.png` |
| 03 | "Subir o aviso 2"           | A ordem do manifesto voltou (A1 primeiro). "Descer o aviso 4" ficou desabilitado no último. O Salvar desabilitou de novo, porque o rascunho ficou igual ao gravado. A prévia em "Aviso 1 de 4" mostra o A1 ("Black Friday · … · Ver ofertas"). Num primeiro snapshot, logo depois do clique, a prévia ainda trazia o A2; no seguinte já trazia o A1 (é a prévia atualizando) | — |
| 04 | "+ Adicionar aviso"         | O contador mostra "5 de 5" e o "+ Adicionar aviso" sumiu. O 5º aviso abriu como Texto, com recusa, "Corrija o que está marcado para salvar." e o Salvar desabilitado | `screenshots/CH-01-r2-05-cinco-de-cinco.png` |
| 05 | Trocar o tipo do 5º aviso para Imagem | Apareceram "Enviar arte · 1440 × 48", "Enviar arte · 780 × 96", "Texto alternativo" (com a dica "O que está escrito na arte.") e "Destino". Três recusas ao mesmo tempo: as duas artes e o texto alternativo | — |
| 06 | Enviar só `arte-1440x48.png` e deixar o texto alternativo vazio | A recusa da arte do computador sumiu. Ficaram as duas outras ao mesmo tempo: "5º aviso: envie a arte do celular." e "5º aviso: Descreva a arte: é o que o leitor de tela e o Google leem.". A barra diz "Corrija o que está marcado para salvar." e o Salvar continua desabilitado | `screenshots/CH-01-r2-07-imagem-dois-motivos.png` |
| 07 | "Tirar o aviso 5"           | Saiu sem confirmação. O contador voltou a "4 de 5", o "+ Adicionar aviso" voltou e o Salvar desabilitou | — |
| 08 | Recarregar o painel         | "Faixa ligada" marcado. A1, A2, A3 e A4 na ordem do manifesto. Salvar desabilitado. Nada foi gravado | `screenshots/CH-01-r2-09-depois-do-f5.png` |
| 09 | Sair da conta (menu "Sua conta" › "Sair") | Voltou para `/admin/login` | — |

**Edge cases tentados:** nada (rodada de confirmação)

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-002 | pass | 05–06 | `screenshots/CH-01-r2-07-imagem-dois-motivos.png` | BUG-001 confirmado como corrigido, em 1 tentativa. Com só a arte do computador, o painel mostra juntos a falta da arte do celular e a do texto alternativo. Os passos 3 e 4 do TC (enviar a segunda arte, escrever o texto alternativo, ver a prévia) não foram refeitos: passaram na r1, e o briefing pediu conferência rápida |
| TC-FUNC-005 | pass | 02–08 | `screenshots/CH-01-r2-03-descer-a1.png`, `screenshots/CH-01-r2-05-cinco-de-cinco.png`, `screenshots/CH-01-r2-09-depois-do-f5.png` | Os passos 1 a 4 conferem. No passo 5 ("Salva e recarrega"), a sessão recarregou sem salvar, porque o briefing proíbe gravar. A ordem final do rascunho já era a do manifesto, e depois do F5 o painel mostra A1..A4. Arrastar e reordenar pelo teclado não foram tentados (orçamento; ver Fora da cobertura) |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- Reordenar arrastando e só pelo teclado (variação do TC-FUNC-005; a nota do TC trata o arrasto como variação manual). Não foram tentados por orçamento
- O que a loja mostra com a ordem trocada e salva. A sessão não grava, por ordem do briefing. Só a prévia foi conferida
- Os passos 3 e 4 do TC-FUNC-002 (segunda arte, texto alternativo, prévia da imagem em Celular e Computador). Passaram na r1 e não foram refeitos
- As variações que ficaram pendentes na r1 (sair da tela sem salvar, trocar de Imagem para Texto com as artes enviadas). A rodada de confirmação não as pede

## Debrief

- **Surpresas:** com o tipo recém-trocado para Imagem, o painel já recusa as três pendências juntas (duas artes e o texto alternativo), antes de qualquer envio. Ao desfazer a reordenação, o Salvar desabilita sozinho
- **Próximo charter:** uma sessão curta com permissão de gravar, para reordenar arrastando e pelo teclado, salvar e ver a ordem na loja. Devolve a ordem do manifesto ao fim
- **Padrão novo:** nada
