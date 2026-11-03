# Sessão CH-03 · Listas e adicionais no painel sob maus-tratos

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-listas-e-adicionais-no-painel.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri · conta: `admin-painel` (usuário de dev do `supabase/seed.sql` §5 — valor não registrado) |
| Tour · modo | Garbage · por técnica (valor limite)                                   |
| Rodada      | exploração                                                             |
| Orçamento   | ~48 ações de browser de 50 (várias ações agruparam passos num único script de Playwright) |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · dev server, build não exposto · Chromium headless (Playwright MCP) · viewport 1440 × 900 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota; dado sintético (produtos QA-*) |

## Missão

Confirmar que a dona monta a lista e os adicionais sem perder o que fez, mesmo empurrando os limites (40 caracteres, 12 peças, 3 adicionais), e que toda recusa vem escrita, com o motivo.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Entrou e abriu Catálogo › Compre Junto | Índice com "QA Correntes · 5 de 12 · 2 joias" e "QA Probe Sem Venda · 1 de 12 · Nenhuma joia"; escolha da forma do bloco | — |
| 02 | "Nova lista": digitou 41 caracteres, depois apagou tudo, depois só 3 espaços | `maxlength=40`: o 41º não entra, contador "40/40". Vazio: "0/40" e a barra "Dê um nome à lista para salvar.", Salvar desabilitado. Só espaços: contador "3/40", a mesma frase e Salvar desabilitado | — |
| 03 | Colou " QA CH03 Correntes ✨\<TAB\>planilha " e deu **duplo clique** em "Salvar lista" (lista sem peças) | Gravou **uma** lista só (índice sem duplicata). Nome guardado aparado nas pontas, mas a **tabulação ficou dentro do nome** (campo mostra `\t`, título e loja mostram como espaço); contador 28/40. Editor diz "Nenhuma peça ainda. A lista só pode ser usada numa joia depois de ter pelo menos uma." | — |
| 04 | Acrescentou 12 peças QA pela busca e tentou a 13ª (QA Pingente Lua) | "12 de 12" e a frase "Uma lista leva até 12 peças. Tire uma para acrescentar outra, ou crie uma segunda lista."; as 12 continuam; já escolhidas aparecem "Já está na lista" desabilitadas | `screenshots/CH-03-04-13a-peca.png` |
| 05 | Tirou uma peça | "11 de 12"; a recusa sumiu | — |
| 06 | Subiu a 3ª peça (Cartier) duas vezes para o topo; "Escolher quais" na Cartier e marcou 45 cm·Não e 60 cm·Não; salvou e recarregou | Numeração atualizou, "Subir" desabilitado na 1ª e "Descer" na última; após recarregar, Cartier em 1º e "Variações: 2 de 4"; as demais "todas as ativas (N)". Texto "Nenhuma marcada vale todas as ativas, inclusive as que você criar depois." | — |
| 07 | Mudou o nome e tocou "Voltar" sem salvar | Voltou ao índice **sem aviso**; a alteração foi descartada em silêncio; o que estava salvo permaneceu | — |
| 08 | Criou "QA CH03 Vazia" sem peças | "Lista salva." e a mensagem de lista vazia | — |
| 09 | M-04 (QA Joia Sem Compre Junto), aba "Compre junto", "Acrescentar um adicional" › "Uma peça de uma lista" | Listas com "N peças · em nenhuma joia / em uso em 2 joias"; **"QA CH03 Vazia — Lista sem peças" desabilitada**. Ao escolher a lista CH03 (que contém M-04): "Esta joia está na lista e é pulada aqui: ela nunca é oferecida junto de si mesma." | — |
| 10 | Adicional 2 "Uma peça só": buscou a própria joia ("QA Joia Sem Compre", "joia sem compre") | **"Nenhuma peça com “QA Joia Sem Compre”. Procure por outra palavra do nome — a busca ignora acento e maiúscula."**; contador "0 de 746" (catálogo 747 no editor de lista). A própria joia some da busca em vez de aparecer desabilitada com "É esta joia". Reproduzido também no M-06 ("Estrela Guia") | `screenshots/CH-03-08-busca-propria-joia.png` |
| 11 | Escolheu QA Berloque Coração no adicional 2; no adicional 3 buscou "QA Berloque" | "QA Berloque Coração — Já está em outro adicional" desabilitado (e no M-06 a Veneziana Banhada idem). Escolheu QA Medalha Afetiva | — |
| 12 | Com 3 adicionais, "Acrescentar um adicional" (duplo clique e clique) | Continua "3 de 3 adicionais", nunca 4; frase "Uma joia leva até 3 adicionais. Tire um para acrescentar outro." (o botão não fica desabilitado; a recusa é texto). Reproduzido no M-06 | `screenshots/CH-03-09-4o-adicional.png` |
| 13 | Marcou e desmarcou "Rosé" no Berloque; tirou o adicional 3 | Chip `aria-pressed` alterna e volta a "todas"; "2 de 3 adicionais" e a recusa sumiu | — |
| 14 | "Trocar" no adicional 2 | Escolha zerou, busca reabriu; barra "1 adicional está sem lista ou peça." e Salvar desabilitado | `screenshots/CH-03-10-trocar-incompleto.png` |
| 15 | Buscou "corrente veneziana" (minúsculas) e "berloque coracao" (sem acento) | As duas acham as peças certas | — |
| 16 | Repôs Berloque com 2 de 3 cores (Prata, Folheado), desceu o adicional 1 (lista) para o fim e deu **duplo clique** em Salvar; recarregou | Sem "Alterações não salvas"; após recarregar: 1 = QA Berloque Coração (Prata 925, Folheado a ouro marcados), 2 = lista CH03; "2 de 3 adicionais". A frase "Compre Junto salvo." não foi capturada (toast pode ter sumido antes da leitura) | — |
| 17 | Loja, M-04 e M-03 | M-04: "Compre junto" com Berloque primeiro e a lista depois, nome da lista com emoji e a tabulação como espaço, "Ver os 7 modelos" (11 − própria joia − Berloque avulso − 2 esgotadas = 7, Cartier em 1º); Berloque só com Prata 925 e Folheado a ouro; Cartier só "45 cm / 60 cm" e "Com gravação: Não". M-03 continua com "QA Correntes · Ver os 4 modelos", igual à massa | `screenshots/CH-03-12-loja-qa-joia-sem-compre-junto.png`, `screenshots/CH-03-12-loja-qa-pingente-lua.png`, `screenshots/CH-03-13-loja-variacoes.png` |
| 18 | Loja: `/qa-ch03-correntes`, `/colecoes/qa-correntes`, `/correntes`, busca "QA CH03", `/sitemap.xml` | As três URLs dão o 404 da loja; busca "0 resultados" (texto de vazio "Tenta o nome do anime, do grupo ou do personagem." — herança da loja anterior); sitemap do dev (7 KB) sem menção à lista — inconclusivo no dev server | — |
| 19 | M-04: tirou os 2 adicionais e salvou; recarregou | "0 de 3 adicionais · Sem Compre Junto. A página desta joia fica como hoje, sem o bloco." — M-04 restaurado | — |
| 20 | Abriu `/admin/compre-junto/listas/00000000-…` | "Esta lista não existe mais. · Voltar às listas" | `screenshots/CH-03-15-lista-inexistente.png` |
| 21 | "Excluir lista" em QA Correntes | Recusa: "Esta lista está em uso em 2 joias (QA Pingente Estrela, QA Pingente Lua). Tire-a delas antes de excluir." | `screenshots/CH-03-16-excluir-em-uso.png` |
| 22 | "Excluir lista" em QA CH03 Vazia e em QA CH03 Correntes (sem uso) | Excluídas **com um clique, sem confirmação**; voltou ao índice com só QA Correntes e QA Probe Sem Venda | — |
| 23 | Saiu do painel e abriu direto as 4 rotas (índice, adesão, nova, lista de M-02) | Todas redirecionam a `/admin/login`, nenhum dado da lista aparece | `screenshots/CH-03-18-deslogada.png` |
| 24 | Entrou de novo; abriu Adesão | Abre ("Compre Junto · Como as peças oferecidas… · 7/30/90 dias") | — |
| 25 | M-06: 4º adicional, trocou o 3º por um novo, buscou a própria joia e o Veneziana Banhada; "Descartar" | Recusa do 4º igual ao passo 12; própria joia: "Nenhuma peça com “Estrela Guia”"; Veneziana Banhada "Já está em outro adicional". "Descartar" pede confirmação ("Descartar as alterações? … Esta ação não pode ser desfeita.") e volta ao banco | — |
| 26 | Abriu M-03 e M-06 no painel para conferir | Os dois mostram **"Alterações não salvas · Rascunho salvo automaticamente · há 1 s"** assim que abrem, antes de qualquer edição e antes de abrir a aba "Compre junto"; sair dispara o `beforeunload`. M-03 aba Compre junto: 1 = QA Correntes (inalterado). M-04 não mostrou isso | `screenshots/CH-03-20-m03-alteracoes-ao-abrir.png` |
| 27 | Saiu da conta e fechou o browser | — | — |

**Edge cases tentados:** duplo clique em "Salvar lista" (1 lista gravada); duplo clique no Salvar do produto (salvou uma vez, estado coerente); nome colado com tabulação, emoji e espaços; só espaços; 41º caractere; 13ª peça; 4º adicional com duplo clique; "Trocar" e salvar incompleto; voltar do editor com alteração não salva; URL de lista inexistente; busca sem acento e em minúsculas; excluir lista em uso; rotas deslogada.

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-SMOKE-003 | pass | 02, 03, 08 | — | "0/40", "Dê um nome à lista para salvar.", "Lista salva."; índice lista as peças como "N de 12" (TC fala "1 peça") |
| TC-JOURNEY-003 | pass | 03–17 | `screenshots/CH-03-12-loja-qa-joia-sem-compre-junto.png` | Feito sobre M-04 com lista "QA CH03…" (não sobre M-01, para preservar a massa); loja reflete ordem e restrições. Toast "Compre Junto salvo." não lido (ver Fora da cobertura) |
| TC-FUNC-029 | pass | 02, 03, 09 | — | Lista vazia desabilitada ("Lista sem peças"); variação de colagem: tabulação guardada no nome (spec-gap) |
| TC-FUNC-030 | pass | 06, 17 | `screenshots/CH-03-13-loja-variacoes.png` | Só pelos botões Subir/Descer; arrasto pela alça não exercitado |
| TC-FUNC-031 | pass | 06, 13, 16, 17 | `screenshots/CH-03-13-loja-variacoes.png` | Lista (2 de 4) e peça só (2 de 3) refletidos na loja; volta a "todas" no painel ok |
| TC-FUNC-035 | pass | 04, 05, 12, 13, 25 | `screenshots/CH-03-04-13a-peca.png`, `screenshots/CH-03-09-4o-adicional.png` | Texto real "Uma joia leva até 3 adicionais…" (TC diz "Cada joia…") |
| TC-FUNC-036 | fail | 10, 11, 09 | `screenshots/CH-03-08-busca-propria-joia.png` | Passo 1 falha (A-1); passos 2 e 3 e a variação "Trocar" passam |
| TC-FUNC-038 | pass | 16, 17, 14 | `screenshots/CH-03-10-trocar-incompleto.png` | Ordenação refletida na loja; variação "adicional incompleto" ok |
| TC-FUNC-039 | pass | 16, 17, 26 | `screenshots/CH-03-12-loja-qa-pingente-lua.png` | M-03 inalterado no painel e na loja após gravar M-04; a aba Geral não foi salva |
| TC-FUNC-040 | pass | 18 | — | 404 nas URLs e busca sem vitrine; `/admin/menu` e `/admin/home` não conferidos, sitemap do dev inconclusivo |
| TC-SEC-001 | pass | 23, 24, 01, 03 | `screenshots/CH-03-18-deslogada.png` | Variação "sair em outra aba" não executada |
| TC-PERSONA-002 | pass | 01–26 | — | Hipótese 1 refutada (recusas escritas, nada se perde); hipótese 3 refutada (exclusão nomeia as joias). Fricções: A-1, saída sem aviso (passo 07), exclusão sem confirmação (passo 22). Três joias não foram montadas (só M-04, para preservar massa) |

Contagem: pass 11 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Painel › aba Compre junto] buscar a própria joia como adicional diz "Nenhuma peça com…", em vez de mostrá-la desabilitada com "É esta joia"

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri |
| Jornada e passo     | J-03, passo 6 (escolher a peça do adicional) · passos 10 e 25 do log |
| TC                  | TC-FUNC-036 |
| Gravidade proposta  | low — a dona não consegue errar (a joia não é oferecida junto de si), mas a mensagem afirma que a peça não existe no catálogo e sugere procurar por outra palavra, o que pode fazê-la duvidar do cadastro |
| Reproduziu          | sim (2 de 2 — M-04 e M-06) |
| Viewport            | 1440 × 900 |

**Passos para reproduzir** — de um estado limpo:

1. Logada como `admin-painel`, abrir `http://localhost:8083/admin/produtos/ee13bca9-19ec-4dd7-9a08-e5087ca3b832/editar` (M-04) e a aba "Compre junto"
2. "Acrescentar um adicional" › "Uma peça só"
3. Digitar "QA Joia Sem Compre" no campo "Peça do adicional 1"

**Esperado:** o resultado "QA Joia Sem Compre Junto" desabilitado, com "É esta joia" — **fonte:** TC-FUNC-036 passo 1; PRD CA-02.5; textos do protótipo do painel.

**Observado:** contador "0 de 746" e "Nenhuma peça com “QA Joia Sem Compre”. Procure por outra palavra do nome — a busca ignora acento e maiúscula." A própria joia é retirada da base da busca (746 contra os 747 do editor de lista). O caso "Já está em outro adicional" funciona como esperado.

**Evidência:**

- `screenshots/CH-03-08-busca-propria-joia.png` — a busca vazia com a frase de "nenhuma peça"
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Nome de lista colado com tabulação guarda o `\t` dentro do nome (pontas aparadas); a loja o mostra como espaço. Emoji aceito e exibido na loja | 03, 17 | polimento |
| "Voltar" do editor de lista com o nome alterado sai sem aviso e descarta a alteração (o formulário do produto, em contraste, avisa e confirma) | 07 | polimento |
| "Excluir lista" de lista sem uso apaga com um clique, sem confirmação nem desfazer | 22 | polimento |
| Formulário do produto (M-03, M-06) abre já em "Alterações não salvas · Rascunho salvo automaticamente" sem edição, antes de abrir a aba Compre junto, e dispara `beforeunload` ao sair; M-04 não. Pode ser o comportamento já registrado antes desta mudança ("Alterações não salvas" ao abrir) ou rascunho local antigo | 26 | pré-existente |
| Texto de vazio da busca da loja: "Tenta o nome do anime, do grupo ou do personagem." (vocabulário da loja anterior) | 18 | pré-existente |
| Recusa do 4º adicional diz "Uma joia leva até 3 adicionais…" e o TC/protótipo cita "Cada joia leva…" | 12 | polimento |
| O botão "Acrescentar um adicional" continua habilitado com 3 adicionais; a recusa vem como texto ao clicar | 12 | polimento |

## Fora da cobertura

- Reordenar pela alça de arrastar (lista e adicionais) — só botões Subir/Descer, por orçamento.
- Ler o toast "Compre Junto salvo." — a gravação foi provada por recarga (estado persistido), não pela frase.
- TC-FUNC-039: salvar também a aba Geral de M-01 e duplicar produto — não feito para não mexer no M-01.
- TC-FUNC-040 passo 3 (`/admin/menu` e `/admin/home` como destino) — orçamento; sitemap no dev server inconclusivo (7 KB, sem menção à lista).
- TC-SEC-001 variação "sair em outra aba e salvar na primeira" — orçamento.
- TC-PERSONA-002 com três joias — montado só em M-04 para preservar M-01 e M-03 (massa dos próximos charters).
- Reordenar a lista e a loja aberta em outra aba sem recarregar (hipótese 2 do TC-PERSONA-002) — não observado.
- Viewport estreito (390) do índice — fora do charter (1440), não feito.

## Estado final da massa tocada

- **M-01 (QA Pingente Estrela)** e **lista "QA Correntes"**: não editados (só abertos; a exclusão da QA Correntes foi recusada). Índice final: QA Correntes 5 de 12 · 2 joias; QA Probe Sem Venda 1 de 12 · Nenhuma joia.
- **M-03**: Compre Junto inalterado (1 = QA Correntes). Abriu com rascunho local "Alterações não salvas" (ver spec-gap); nada foi gravado.
- **M-04**: recebeu 2 adicionais durante a sessão e foi **restaurado** a "0 de 3 adicionais" (salvo e conferido após recarga).
- **M-06**: editado sem salvar e **descartado**; 3 adicionais de antes mantidos (não reconferido após o descarte por orçamento).
- Listas criadas "QA CH03 Correntes ✨ planilha" (11 peças) e "QA CH03 Vazia": **excluídas** ao fim.
- Nenhum produto não-QA foi editado.

## Debrief

- **Surpresas:** a própria joia some da busca do adicional em vez de vir desabilitada; formulários de produto abrindo com rascunho "não salvo".
- **Próximo charter:** confirmar se o rascunho "Alterações não salvas" em M-03/M-06 vem de antes desta mudança; a reconferência do M-06 após o descarte.
- **Padrão novo:** colar texto com tabulação em campo de nome (achou o `\t` guardado).
