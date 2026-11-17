# Sessão CH-01 · Pôr no ar o bloco da campanha em vigência

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-por-o-bloco-da-vigente-no-ar.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*`                  |
| Tour · modo | Feature · por cenário (J-01)                                           |
| Rodada      | exploração                                                             |
| Orçamento   | 97 ações de browser de 70 — o teto chegou no passo 09 (o Salvar que não deu recibo); as 27 a mais foram para saber se B-1 tinha gravado (a massa que os próximos charters esperam), conferir a loja e a linha, sair e fechar |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports painel 1440 × 900, loja 390 × 844 · rotas abortadas: `**/*.supabase.co/**`, `**/g/collect*` |
| Paridade    | Supabase local com massa sintética (manifesto do WI 103); fotos do Storage hospedado bloqueadas |

## Missão

Confirmar que a dona, sozinha e sem ajuda, tira o bloco "Joias em oferta" do estado "sem campanha" em que a
atualização o deixou, escreve o título e a descrição, escolhe e ordena três peças da campanha em vigência,
confere na prévia e o vê na loja com as palavras e a ordem dela.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel e abrir Loja → Home; ler a linha de "Joias em oferta" | O login leva ao Dashboard (não volta a `/admin/home`); pelo menu, Home. A linha de B-1 diz "sem campanha" e, abaixo, "O bloco está sem campanha e não aparece na loja. Escolha uma campanha." — e ao mesmo tempo o selo **"No ar"**, com o interruptor ligado; o cabeçalho conta "16 seções · 10 no ar", contando B-1 (A-2) | `screenshots/CH-01-01-linha-sem-campanha.png` |
| 02 | Abrir a loja noutra aba, sem login, em 390 × 844, e descer até onde o bloco ficava | Nenhum bloco "Joias em oferta": a faixa de vantagens é seguida direto pela navegação de categorias, sem região vazia nem esqueleto na árvore | `screenshots/CH-01-02-loja-sem-bloco-390.png` |
| 03 | Abrir B-1 | Editor com Conteúdo (Título do bloco 0/60, Descrição do bloco 0/160, cada um com a dica do recuo), Campanha (aviso "O bloco está sem campanha e não aparece na loja. Escolha uma campanha." e radiogroup "Campanha do bloco" com "Dia das Mães · Em vigência · 13/11 a 30/11/2026" e "Natal · Agendada · 01/12 a 24/12/2026", nessa ordem; "Black Friday" não aparece) e Peças escolhidas ("0 de 12", "Escolha a campanha do bloco para buscar as peças: ele mostra só as peças marcadas nela.", sem campo de busca) | — |
| 04 | Escolher "Dia das Mães" antes de escrever qualquer coisa | Por um instante "Conferindo as peças marcadas na campanha…", depois a busca "Acrescentar uma peça" com "20 na campanha" e as 20 marcadas. A prévia (Celular) mostra o bloco: "DIA DAS MÃES" acima do título "Dia das Mães", "Peças selecionadas com 10% e 15% de desconto. O valor de cada joia já aparece com o desconto.", cartões de 10 % e 15 %, e as primeiras peças da campanha | `screenshots/CH-01-04-previa-recuo-campanha.png` |
| 05 | Salvar com a campanha escolhida e título e descrição vazios (edge case "enviar vazio") | "Salvo" no botão; nada exige título | — |
| 06 | Recarregar a loja (aba sem login) | O bloco igual ao da prévia: selo "DIA DAS MÃES", título "Dia das Mães", a frase dos percentuais, os cartões | — |
| 07 | Procurar "Colar Afetivo Redonda" (P-AGE, só em "Natal") | "0 de 20" e "Nenhuma peça com “Colar Afetivo Redonda”. Procure por outra palavra do nome — a busca ignora acento e maiúscula." — a busca não a oferece, mas a mensagem não diz que a peça pode não estar marcada na campanha (spec-gap) | `screenshots/CH-01-05-busca-peca-fora.png` |
| 08 | Procurar "6 coracoes" (sem acento) e escolher P-1; com o mesmo termo no campo, ver P-1 de novo; escolher P-2 ("Amor Mãe") e P-3 ("Colméia") | A busca sem acento acha P-1; P-1 entra como "1ª" com Subir/Descer/Remover; na busca, P-1 aparece desabilitada com "já está no bloco". "3 de 12" com P-1, P-2, P-3 | — |
| 09 | Só pelo teclado: focar "Subir a 3ª peça" e Enter duas vezes; escrever o título "Joias para guardar quem a gente ama" e uma descrição de 97 caracteres | A lista renumera: 1ª P-3, 2ª P-1, 3ª P-2; "Alterações não salvas". A prévia acompanha o texto e, um instante depois, a ordem P-3, P-1, P-2 — sem salvar | `screenshots/CH-01-08-previa-rascunho-ordem.png` |
| 10 | Salvar com duplo clique (edge case), depois um clique só | Nos dois casos, nenhum "Salvo": o cabeçalho continua "Alterações não salvas" e o botão "Salvar seção ⌘S", sem mensagem nem alerta (esperei 25 s cada vez). Console sem erro; rede: `DELETE /rest/v1/home_section_items → 204`, `POST /rest/v1/home_section_items → 201`, `GET /rest/v1/home_sections → 200` (A-1) | `screenshots/CH-01-09-editor-sem-recibo-salvo.png` |
| 11 | Recarregar a loja | O bloco está gravado: "DIA DAS MÃES" acima de "Joias para guardar quem a gente ama", a descrição dela, e P-3, P-1, P-2 nessa ordem | `screenshots/CH-01-10-loja-bloco-salvo-390.png` |
| 12 | Voltar à lista da Home | A linha: "Joias em oferta · Campanha “Dia das Mães” · em vigência até 30/11 às 23:59", "No ar", ligado | — |
| 13 | Reabrir B-1 | Campanha, título, descrição e P-3, P-1, P-2 como salvos; o cabeçalho sem "Alterações não salvas" | — |
| 14 | Sair da conta e fechar | Volta a `/admin/login` | — |

Nota de condução: no passo 12, a primeira tentativa de voltar à lista usou o nome "Home" e acertou o botão
"Remover esta seção da Home"; o confirm "Remover “Joias em oferta” da Home? Os itens escolhidos nela também são
apagados." foi **recusado** na hora, e B-1 seguiu intacto (passos 12 e 13). Erro de condução, não do app.

**Edge cases tentados:**

- Enviar vazio (campanha escolhida, título e descrição vazios): grava, sem exigir título — ok
- Fora de ordem (campanha antes do texto; peças antes do título): a prévia mostra o recuo e depois acompanha — ok
- Só teclado (Subir com Enter): a lista e a prévia acompanham — ok
- Busca sem acento ("6 coracoes"): acha P-1 — ok
- Duplo clique no Salvar: grava uma vez só (três peças na loja, sem duplicar), mas sem recibo — A-1

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-001 | fail | 03–11 | `screenshots/CH-01-09-editor-sem-recibo-salvo.png` · `screenshots/CH-01-10-loja-bloco-salvo-390.png` | A-1: o passo 5 não mostra "Salvo"; o resto da jornada passa (a loja tem o bloco com o texto e a ordem dela; a linha diz a campanha e o estado). Variação 1440 na loja não conferida |
| TC-FUNC-001 | pass | 01–03 | `screenshots/CH-01-01-linha-sem-campanha.png` · `screenshots/CH-01-02-loja-sem-bloco-390.png` | a linha e o editor pedem a escolha; a loja sem o bloco e sem espaço. O selo "No ar" na mesma linha é A-2. Variações (religar, loja 1440) não feitas |
| TC-FUNC-002 | pass | 03 | — | "Dia das Mães" e "Natal" na ordem do início, com estado e vigência; "Black Friday" fora; radiogroup com rótulo "Campanha do bloco". Variação só teclado não feita |
| TC-FUNC-003 | pass | 04–06 | `screenshots/CH-01-04-previa-recuo-campanha.png` | selo acima, título = nome, frase dos percentuais, cartões, primeiras peças; a loja igual. Variações não feitas |
| TC-FUNC-004 | pass | 03, 07, 08 | `screenshots/CH-01-05-busca-peca-fora.png` | sem campanha, a busca não existe e a tela diz por quê; a peça só de "Natal" não é oferecida; P-1 desabilitada "já está no bloco"; sem acento acha |
| TC-FUNC-005 | pass | 09 | `screenshots/CH-01-08-previa-rascunho-ordem.png` | passos 1, 2 e 4 conferidos (rótulos, linha com posição/nome/remover, Subir pelo teclado, prévia acompanha sem salvar). Passo 3 (arrastar) e 5 (remover e escolher de novo) não feitos — orçamento |
| TC-FUNC-006 | fail | 10, 12, 13 | `screenshots/CH-01-09-editor-sem-recibo-salvo.png` | A-1: sem "Salvo", fica "Alterações não salvas". Passo 2 (linha diz "Dia das Mães" e em vigência) e passo 3 (reabrir mostra o salvo) passam; duplo clique não duplicou peça |
| TC-FUNC-007 | skip | — | — | orçamento esgotado no passo 10; limites de 60/160/12 não tentados |

Contagem: pass 5 · fail 2 · blocked 0 · skip 1

## Achados

### A-1 · [Editor do bloco] Salvar com peças grava, mas não mostra "Salvo" e mantém "Alterações não salvas" — a dona não sabe se salvou

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 8 (salvar) · passo 10 do log                              |
| TC                  | TC-FUNC-006, TC-JOURNEY-001                                           |
| Gravidade proposta  | high — a gravação acontece, mas a tela diz o contrário; a persona tem "zero paciência para 'salvou?' sem resposta" e tende a salvar de novo, sair achando que perdeu ou ir conferir a loja |
| Reproduziu          | sim (2 de 2 na mesma sessão: duplo clique e, em seguida, um clique só — a 2ª tentativa não partiu de estado limpo; o primeiro salvamento, só com a campanha e sem peças, mostrou "Salvo") |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. `admin-loja` no painel, `http://localhost:8083/admin/home`, abrir "Joias em oferta" com "Dia das Mães" já salva e sem peças
2. Escolher P-1, P-2 e P-3 pela busca; subir a 3ª duas vezes (P-3, P-1, P-2); escrever título e descrição
3. Clicar "Salvar seção" (no log: duplo clique; depois, um clique)
4. O cabeçalho continua "Alterações não salvas" e o botão "Salvar seção ⌘S"; nenhum "Salvo", nenhum alerta

**Esperado:** o selo "Salvo" no lugar de "Alterações não salvas", a tela no editor — **fonte:** PRD CA-01.2 · TC-FUNC-006 passo 1 · TC-JOURNEY-001 passo 5

**Observado:** sem recibo e sem erro; "Alterações não salvas" permanece. A gravação aconteceu: a loja sem login
mostra o bloco com o título, a descrição e P-3, P-1, P-2, e reabrir o editor traz tudo salvo, sem "Alterações não
salvas". Para a triagem: falta separar o gatilho — duplo clique × qualquer salvamento com peças escolhidas —
num reteste de estado limpo com um clique só.

**Evidência:**

- `screenshots/CH-01-09-editor-sem-recibo-salvo.png` — o editor depois de salvar, ainda "Alterações não salvas"
- `screenshots/CH-01-10-loja-bloco-salvo-390.png` — a loja com o bloco gravado
- console: nada
- rede: `DELETE /rest/v1/home_section_items → 204` · `POST /rest/v1/home_section_items → 201` · `GET /rest/v1/home_sections → 200`

### A-2 · [Lista da Home] A linha do bloco sem campanha diz "No ar" e entra na conta "no ar", enquanto avisa que não aparece na loja

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 1 (ler a lista) · passo 01 do log                         |
| TC                  | TC-FUNC-001                                                           |
| Gravidade proposta  | medium — o aviso é claro, mas o selo e a contagem dizem o oposto; a dona que bate o olho no selo acha que o bloco está na loja |
| Reproduziu          | intermitente (1 de 1 — não repetido: o estado "sem campanha" deixou de existir ao salvar no passo 05) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. `admin-loja` no painel, com B-1 ligado e sem campanha (estado da migration)
2. Abrir `http://localhost:8083/admin/home`
3. Ler a linha "Joias em oferta" e o cabeçalho "Seções da Home"

**Esperado:** a linha diz que o bloco não aparece na loja, mesmo com o interruptor ligado — **fonte:** PRD CA-02.4 · TC-FUNC-001 passo 1

**Observado:** subtítulo "sem campanha" e o aviso "O bloco está sem campanha e não aparece na loja. Escolha uma
campanha." — mas o selo da linha é "No ar" (o mesmo das seções que aparecem) e o cabeçalho diz "16 seções · 10 no
ar", contando B-1.

**Evidência:**

- `screenshots/CH-01-01-linha-sem-campanha.png` — a linha com "No ar" e o aviso juntos
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Procurar pelo nome uma peça que existe mas não está marcada na campanha devolve "Nenhuma peça com “…”. Procure por outra palavra do nome — a busca ignora acento e maiúscula." — sugere trocar a palavra, sem lembrar que a busca só mostra as marcadas na campanha (a frase existe só antes da escolha; depois, só "0 de 20"). É a hipótese de fricção 2 da persona | 07 | polimento |

## Fora da cobertura

- TC-FUNC-007 inteiro (título 61, descrição 161, P-4..P-10 e a 13ª, Cancelar) — orçamento esgotado no passo 10; nada foi posto no rascunho além de P-1..P-3
- TC-FUNC-005 passos 3 (arrastar) e 5 (remover e escolher de novo), e a variação prévia em Computador — orçamento
- Edge cases: colar título com aspas curvas e travessão, recarregar com rascunho por salvar, voltar do browser com alteração não salva — orçamento
- Variações: loja em 1440, religar B-1 sem campanha, seletor só pelo teclado, "xyzw" na busca — orçamento
- Fonte a 130 % e 200 % nas telas novas — é do CFR (CH-07); não feito aqui

## Debrief

- **Surpresas:** o Salvar com peças grava sem dizer que gravou (A-1) — custou a margem do orçamento, porque a massa dos próximos charters dependia de saber se B-1 tinha gravado. Estado final de B-1, conferido na loja e no editor: "Dia das Mães", título "Joias para guardar quem a gente ama", descrição de 97 caracteres, P-3, P-1, P-2, ligado
- **Próximo charter:** um reteste curto de A-1 de estado limpo (um clique só, com e sem peças) e o TC-FUNC-007 com os edge cases de rascunho (recarregar, voltar, colar), que ficaram de fora. Fora do escopo, só para o backlog: a faixa de avisos da loja ainda diz "Black Friday · novembro inteiro com joias em oferta" com a Black Friday encerrada; e o login no painel cai no Dashboard em vez de voltar a `/admin/home`
- **Padrão novo:** duplo clique no Salvar seguido de um clique só — achou A-1
