# Sessão CH-08 · design-check — os padrões do protótipo no editor do bloco

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-08-design-check.md` · design-check · P2        |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: admin-loja-2 — `QA_ADMIN_LOJA_2_*` (mesmo papel de admin; a `admin-loja` estava com o CH-03 no lote) |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 36 ações de browser de 25 — estouro: 7 na tentativa do link do protótipo (barrado), 3 para conferir que o Cancelar não gravou (A-3) e 6 para sair da conta e fechar |
| Ambiente    | http://localhost:8083 (painel, worktree feature-103) · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 1440 × 900 · rotas `**/*.supabase.co/**` e `**/g/collect*` abortadas |
| Paridade    | protótipo lido pela cópia decodificada do bundle (o link exige verificação Cloudflare/login); CSS do protótipo não está no bundle — sem valores de cor, tipografia e espaço |

## Missão

Conferir se os três padrões que a costura adotou do protótipo estão no editor do bloco como o protótipo os
desenha — e só eles: as telas do bloco não estão no protótipo.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir o protótipo pelo link (https://claude.ai/artifact/SQehnBNiiQmbnjkY3QQpbq) | "Executando verificação de segurança" da Cloudflare (desafio "Confirme que é humano"), antes de qualquer login. Não contornado. Passou-se à cópia decodificada do bundle indicada no briefing | — |
| 02 | Listar as telas do protótipo e localizar os três padrões (fonte: cópia do bundle) | Telas: Campanhas · lista, Campanha · editar, Campanha · nova, Produto · campo da campanha, Faixa de avisos, Configurações · perfil de estilo. **Contador:** Campanha · editar, campos "Nome da campanha" e "Texto do selo" — `<label>` e `<span class="cnt">{n} / 40</span>` na mesma linha (`cnt-l`), acima do campo; também na Faixa de avisos ("Trecho em destaque" n / 40, "Texto" n / 60). **Recusa:** "Texto do selo" acima de 14 — o contador ganha a classe `err`, o campo `aria-invalid`, e abaixo do campo um `<p class="err-l">` com o ícone `alert` (triângulo, 16 px) + texto ("O selo cabe até 14 caracteres no cartão do celular. Use uma forma curta do nome."), no lugar da dica. A recusa aparece ao digitar, sem salvar. **Lista ordenada:** Faixa de avisos › Avisos — por linha: número, resumo e `ord-acts` com três botões de ícone: "Subir o aviso N" (ícone `up`, desabilitado no 1º), "Descer o aviso N" (ícone `down`, desabilitado no último), "Tirar o aviso N" (ícone `x`) | — (fonte: `91cda35b…bin`, `869c674b…bin` l. 94-101, `d1e455fc…bin` l. 69-73, `093ca953…bin` ícones) |
| 03 | Entrar no painel e abrir o editor de B-1 ("Abrir Joias em oferta" em /admin/home) | Editor `/admin/home/e50a633d-…`. FormCard Conteúdo: rótulo "Título do bloco" e, na mesma linha à direita (flex, space-between), o contador "35/60"; "Descrição do bloco" com "97/160". Dicas abaixo dos campos. FormCard Peças escolhidas: "3 de 12", lista com "1ª/2ª/3ª", nome da peça e três botões por linha: "Subir a Nª peça" (desabilitado na 1ª), "Descer a Nª peça" (desabilitado na 3ª), "Remover a Nª peça"; puxador de arraste à esquerda | `screenshots/CH-08-04-sem-recusa-61.png` (parte de baixo mostra a 1ª linha da lista) |
| 04 | Digitar 61 caracteres no título e 161 na descrição (rascunho) | O campo aceita (sem `maxLength`). O contador vai a "61/60" e "161/160", **mesma cor cinza** do estado normal. **Nenhuma recusa** abaixo dos campos: continuam as dicas "Vazio, o bloco usa o nome da campanha." e "Vazia, o bloco diz os percentuais…". Sem ícone, sem `aria-invalid`, sem `aria-describedby`, nada no snapshot com papel `alert` | `screenshots/CH-08-04-sem-recusa-61.png` |
| 05 | Sair do campo (Tab) para ver se a recusa vem no blur | Igual ao 04: sem recusa, contador inalterado | snapshot (texto) |
| 06 | Cancelar | Volta a /admin/home sem diálogo. A **prévia da Home** à direita mostra o bloco com o título de 61 "a" (o rascunho cancelado) | — (snapshot: `heading "aaaa…a" [level=2]` na prévia) |
| 07 | Recarregar /admin/home para conferir que nada foi gravado | A prévia volta a "Joias para guardar quem a gente ama"; a linha do bloco intacta. Nada persistiu | — (snapshot) |
| 08 | Sair da conta e fechar o browser | Menu "Sua conta" › Sair → /admin/login; sessão fechada | — |

**Edge cases tentados:** recusa da descrição (161) além da do título (61) — passo 04; recusa no blur — passo 05. Foco de subir/descer: não tentado (orçamento).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-UI-002 | fail | 02-06 | `screenshots/CH-08-04-sem-recusa-61.png` | passo 1 (padrões localizados) ok; passo 2 contador ao lado do rótulo ok, formato "n/limite" é desvio declarado (I-06); passo 3 falha — A-1; passo 4 três controles por linha ok, nome e ícone do "tirar" diferem — A-2; passo 5 ok. Variação foco não conferida |

Contagem: pass 0 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Painel › editor do bloco] título e descrição acima do teto não mostram recusa nem marcam o contador — Adri não vê onde errou

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | — (design-check) · passos 04-05 do log                               |
| TC                  | TC-UI-002 (passo 3)                                                   |
| Gravidade proposta  | medium — ela escreve um título longo e nada na tela diz que passou do limite; no melhor caso descobre só ao salvar (não tentado: massa só leitura) |
| Reproduziu          | sim (2 de 2) — após digitar e após sair do campo, nos dois campos (título e descrição), na mesma abertura do editor; não reaberto de estado limpo por orçamento |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Painel http://localhost:8083 com uma conta admin; /admin/home › "Abrir Joias em oferta"
2. No FormCard Conteúdo, apagar o "Título do bloco" e digitar 61 caracteres; na "Descrição do bloco", 161
3. Olhar abaixo dos campos e o contador; sair do campo com Tab

**Esperado:** como o "Texto do selo" do protótipo acima do teto — contador em estado de erro, campo `aria-invalid` e, abaixo do campo, a recusa com o ícone de alerta e o texto do motivo no lugar da dica, já ao digitar — **fonte:** protótipo `SQehnBNiiQmbnjkY3QQpbq`, tela Campanha · editar, campo "Texto do selo" (padrão adotado pela costura, spec.md D-01, para CA-01.6)

**Observado:** contador "61/60" e "161/160" na mesma cor do estado normal; abaixo dos campos só as dicas de sempre; nenhum ícone, nenhuma mensagem, campo sem `aria-invalid`. O campo aceita o 61º caractere.

**Evidência:**

- `screenshots/CH-08-04-sem-recusa-61.png` — título com 61 e descrição com 161, contadores 61/60 e 161/160 em cinza, dicas sem recusa
- console: não coletado
- rede: nada

### A-2 · [Painel › editor do bloco] o controle de tirar a peça chama-se "Remover" e usa lixeira, onde o protótipo diz "Tirar" com ×

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | — (design-check) · passo 03 do log                                    |
| TC                  | TC-UI-002 (passo 4)                                                   |
| Gravidade proposta  | low — a ação é a mesma e é compreensível; diferença de texto e ícone em relação ao padrão |
| Reproduziu          | sim (2 de 2) — nas três linhas da lista                               |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Painel, conta admin; /admin/home › "Abrir Joias em oferta"
2. FormCard Peças escolhidas: ler o terceiro botão de cada linha

**Esperado:** "Tirar o aviso N" com o ícone `x` — **fonte:** protótipo `SQehnBNiiQmbnjkY3QQpbq`, tela Faixa de avisos, lista Avisos (`ord-acts`)

**Observado:** botão "Remover a 1ª peça" (2ª, 3ª) com ícone de lixeira.

**Evidência:**

- `screenshots/CH-08-04-sem-recusa-61.png` — primeira linha da lista, embaixo, com setas e lixeira
- console: nada
- rede: nada

### A-3 · [Painel › Home] depois de Cancelar o editor, a prévia da Home mostra o rascunho descartado

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | — (fora da superfície do design-check, achado de passagem) · passo 06 do log |
| TC                  | —                                                                     |
| Gravidade proposta  | high — ela cancela e vê, na prévia do que a cliente vê, o texto que descartou: passa a duvidar se cancelou ou gravou (só some ao recarregar) |
| Reproduziu          | intermitente (1 de 1) — sem orçamento para a segunda tentativa        |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Painel, conta admin; /admin/home › "Abrir Joias em oferta"
2. Trocar o "Título do bloco" por outro texto (sem salvar)
3. Clicar em "Cancelar"; olhar o bloco na prévia à direita de /admin/home
4. Recarregar a página

**Esperado:** a prévia mostra o bloco salvo, sem o rascunho cancelado — **fonte:** o subtítulo da própria tela ("O que a cliente vê ao abrir a loja…") e a ação "Cancelar"; nenhuma fonte escrita lida nesta sessão detalha a prévia depois de Cancelar

**Observado:** no passo 3, a prévia mostra o título de 61 "a" (`heading level=2` na região do bloco). Depois do reload, volta a "Joias para guardar quem a gente ama" — nada foi gravado.

**Evidência:**

- sem screenshot (achado no passo de saída, orçamento esgotado); snapshot do passo 06 com o heading do rascunho e do passo 07 com o título salvo
- console: não coletado
- rede: nada

## Design

**Protótipo:** `SQehnBNiiQmbnjkY3QQpbq` · Painel — Campanhas, faixa de avisos e perfil de estilo · `link` · lido pela cópia decodificada do bundle (o link para em verificação Cloudflare/login); sem o CSS — só estrutura, texto e ícone são régua

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | `/admin/home/<B-1>` Conteúdo · Campanha › editar "Nome da campanha" | contador do título e da descrição | texto (formato) | `n / teto` ("35 / 60") | `n/teto` ("35/60", "97/160") · 1440 | `screenshots/CH-08-04-sem-recusa-61.png` | — desvio declarado (I-06) |
| D2 | `/admin/home/<B-1>` Conteúdo · Campanha › editar "Texto do selo" (erro) | recusa do título e da descrição acima do teto | estrutura · estado erro | `<p>` abaixo do campo com ícone `alert` 16 px + texto do motivo; contador `err`; `aria-invalid` | ausente: só a dica, contador sem estado de erro, sem `aria-invalid` · 1440 | `screenshots/CH-08-04-sem-recusa-61.png` | A-1 |
| D3 | `/admin/home/<B-1>` Peças escolhidas · Faixa de avisos › Avisos | 3º controle da linha | texto (nome acessível) · ícone | "Tirar o aviso N" · ícone `x` | "Remover a Nª peça" · lixeira · 1440 | `screenshots/CH-08-04-sem-recusa-61.png` | A-2 |

Iguais ao protótipo: contador na mesma linha do rótulo, à direita, acima do campo; subir/descer por linha com nome "Subir/Descer …", ícones de seta, desabilitados na primeira e na última linha. A mais no app: puxador de arraste e o ordinal "1ª" (o protótipo tem o número "1") — o arraste é previsto (D-01: botões como alternativa ao arraste).

**Telas não conferidas:** o bloco inteiro, a linha da Home e a bandeja — sem frame no protótipo; estado de foco de subir/descer — não provocado (orçamento), e o protótipo não fixa foco sem o CSS

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O título e a descrição aceitam digitar além do teto (sem `maxLength`), enquanto o "Nome da campanha" do protótipo corta em 40; se a recusa existe só ao salvar, isso não foi visto (massa só leitura) | 04 | polimento |

## Fora da cobertura

- Foco visível de subir/descer (variação do TC-UI-002) — orçamento esgotado
- Se a recusa aparece ao tentar salvar — a massa proíbe salvar
- Cor, tipografia e espaço dos três padrões — o CSS do protótipo não está na cópia do bundle; o link não abriu
- Reproduzir A-3 de estado limpo e fotografá-lo — orçamento esgotado
- Fonte a 130 % e 200 % e viewport 390 do ambiente — fora da missão deste design-check (CFR, CH-07)

## Debrief

- **Surpresas:** o Cancelar deixa o rascunho na prévia da Home (A-3); o link do protótipo para em verificação Cloudflare antes do login
- **Próximo charter:** confirmar A-3 de estado limpo (com screenshot) e ver a recusa do título ao tentar salvar, numa sessão que possa provocar o Salvar com dado inválido
- **Padrão novo:** cancelar um editor e olhar a prévia da tela de origem antes de recarregar
