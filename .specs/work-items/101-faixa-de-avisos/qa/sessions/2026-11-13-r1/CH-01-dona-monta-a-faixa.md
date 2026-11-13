# Sessão CH-01 · A dona monta a faixa da Black Friday

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-dona-monta-a-faixa.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-loja` (`QA_ADMIN_LOJA_*`) |
| Tour · modo | Feature · por cenário (J-01) |
| Rodada      | exploração |
| Orçamento   | ~50 ações de browser de 50 (contando cada chamada de open/click/fill/batch/upload/snapshot/screenshot/reload/tab; rotas, viewport e esperas fora da conta). O sair da conta passou o teto em 2 ações |
| Ambiente    | painel http://localhost:8083/admin · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 1440 × 900 |
| Paridade    | Supabase local (Storage local para as artes); rotas `*.supabase.co` e `**/g/collect*` abortadas; HTML da loja em dev sem `data-faixa` (esperado) |

## Massa gravada (para os charters seguintes)

- **C1 = `/joias-afetivas`** (1º item do menu da loja, "JOIAS AFETIVAS")
- **C2 = `/amuletos`** (2º item do menu da loja, "COLEÇÃO AMULETOS")
- Gravado pela tela e conferido depois do F5: interruptor **ligado**; 4 avisos, nesta ordem:
  1. A1 · Texto · `Black Friday` · `novembro inteiro com joias em oferta` · `Ver ofertas` · `/joias-afetivas`
  2. A2 · Texto · `10%, 15% e 20% de desconto` · `em anéis, colares e pingentes selecionados no ateliê` · `Ver as peças` · `/amuletos`
  3. A3 · Texto · `Frete grátis` · `acima de R$ 450,00 para Sul e Sudeste` · sem rótulo · sem destino
  4. A4 · Imagem · `arte-1440x48.png` + `arte-780x96.png` · alt `Black Friday na Uma Estrelinha: joias em oferta em novembro` · `/joias-afetivas`

## Missão

Confirmar que a Adri, sozinha e sem ajuda, monta os quatro avisos da Black Friday, confere a prévia e põe a faixa no ar, e que o que ela salvou é o que a loja mostra.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e abriu **LOJA › Faixa de avisos** pela navegação | URL `/admin/faixa-de-avisos`; título "Faixa de avisos"; subtítulo "A faixa fina acima do cabeçalho, em todas as páginas da loja (menos o checkout). Um aviso por vez, trocando a cada 6 segundos."; interruptor "Faixa ligada" desligado com "Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja." ao lado; ajuda "Sem contagem regressiva, sem “últimas unidades” e sem exclamação: o tom da loja vale aqui também."; "0 de 5"; prévia "A faixa está desligada: a loja abre sem ela."; Salvar desabilitado | `screenshots/CH-01-01-tela-vazia.png` |
| 02 | Abriu a loja numa aba para achar as duas primeiras categorias do menu | C1 `/joias-afetivas`, C2 `/amuletos` | — |
| 03 | "+ Adicionar aviso" | aviso 1 aberto, tipo Texto (só "Texto" e "Imagem" no rádio "Tipo do aviso"), contadores 0/40, 0/60, 0/20; já mostra o alerta "1º aviso: escreva o trecho em destaque ou o texto. Um aviso vazio não aparece na loja." e "Corrija o que está marcado para salvar." antes de digitar | — |
| 04 | Preencheu A1 | contadores 12/40 · 36/60 · 11/20; resumo "Texto · /joias-afetivas"; sem recusa; "Alterações não salvas." e Salvar habilitado | — |
| 05 | Acrescentou A2 (90 caracteres somados) e A3 | A2 aceito (26 + 52 + 12), resumo "Texto · /amuletos"; A3 "Texto · sem link"; um aviso aberto por vez; "3 de 5" | — |
| 06 | Acrescentou o 4º aviso e trocou para Imagem | aparecem "Enviar arte · 1440 × 48", "Enviar arte · 780 × 96", "Texto alternativo" com a dica "O que está escrito na arte." e "Destino" | — |
| 07 | Enviou `arte-errada.txt` na arte do computador | recusado no campo: "arte-errada.txt: formato não aceito — use PNG, JPG ou WebP"; segue "4º aviso: envie a arte do computador." | — |
| 08 | Enviou só a arte do computador, texto alternativo vazio | "Enviando…" e depois a miniatura (img 1440×48) no aviso; recusa só "4º aviso: envie a arte do celular." — o motivo do texto alternativo vazio **não** aparece junto; "Corrija o que está marcado para salvar."; Salvar desabilitado | `screenshots/CH-01-08-imagem-sem-celular.png` |
| 09 | Enviou a arte do celular e digitou três espaços no texto alternativo | recusado como vazio: "4º aviso: Descreva a arte: é o que o leitor de tela e o Google leem."; Salvar desabilitado | — |
| 10 | Escreveu o alt do manifesto, destino C1, ligou "Faixa ligada" | recusas somem; resumo "Imagem · /joias-afetivas"; "4 de 5"; Salvar habilitado; a ajuda do atraso fica ao lado do interruptor | — |
| 11 | Olhou a prévia no Celular | "390 × 844 · 64%"; "Aviso 4 de 4" (o aviso aberto); faixa acima do cabeçalho da loja com o link-imagem de alt do manifesto; "Próximo aviso" desabilitado no último | `screenshots/CH-01-11-previa-celular-a4.png` |
| 12 | "Aviso anterior", depois Computador | "Aviso 3 de 4"; "1024 × 768 · 65%"; faixa com "Aviso anterior"/"Próximo aviso" nas pontas e "Frete grátis · acima de R$ 450,00 para Sul e Sudeste" — o rascunho não salvo | `screenshots/CH-01-12-previa-computador-a3.png` |
| 13 | Duplo clique em "Salvar alterações" | "Salvo. Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja." uma vez; Salvar desabilitado; console sem erro | — |
| 14 | Recarregou (F5) | interruptor ligado; "4 de 5"; os quatro avisos na ordem e com os textos do manifesto, nada duplicado; "Subir o aviso 1" e "Descer o aviso 4" desabilitados | `screenshots/CH-01-14-depois-do-f5.png` |
| 15 | Abriu `http://localhost:8082/` numa aba nova | região "Avisos da loja" acima do cabeçalho com o A1 "Black Friday · novembro inteiro com joias em oferta · Ver ofertas" e as setas | `screenshots/CH-01-15-loja-faixa-a1.png` |
| 16 | Saiu da conta pelo menu "Sua conta › Sair" | volta a `/admin/login` | — |

**Edge cases tentados:**

- Duplo clique no Salvar — uma gravação só, frase do salvo uma vez, nada duplicado depois do F5
- Recarregar logo depois de salvar — tudo relido igual
- Enviar arquivo que não é imagem (`arte-errada.txt`) — recusado no campo
- Texto alternativo só com espaços — recusado como vazio
- Dado limite: destaque + texto + rótulo = 90 (A2) — aceito

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-001 | pass | 01–15 | `screenshots/CH-01-14-depois-do-f5.png`, `screenshots/CH-01-15-loja-faixa-a1.png` | variação "duplo clique" ok; variação "sair sem salvar" não tentada (orçamento); a miniatura do A4 depois do F5 não foi conferida (aviso fechado na lista) |
| TC-FUNC-002 | fail | 06–10 | `screenshots/CH-01-08-imagem-sem-celular.png` | A-1: no passo 2 só aparece o motivo da arte do celular, não o do texto alternativo vazio. Resto ok: campos, miniatura, `.txt` recusado, alt só com espaços recusado, Salvar volta a habilitar. Prévia da imagem vista só no Celular; a variação Imagem→Texto→Imagem não foi tentada |
| TC-FUNC-005 | skip | — | — | orçamento: reordenar, 5 de 5 e voltar a 4, teclado e arrastar não tentados. Só se viu "Subir o aviso 1" e "Descer o aviso 4" desabilitados (passo 14) |
| TC-FUNC-006 | pass | 11–12 | `screenshots/CH-01-11-previa-celular-a4.png`, `screenshots/CH-01-12-previa-computador-a3.png` | Celular e Computador, "Aviso N de 4", "Aviso anterior" respondendo depois de abrir o aviso 4, rascunho não salvo na prévia. Não conferido: a faixa não girar sozinha em 10 s, editar o A3 e desfazer |
| TC-FUNC-007 | pass | 01, 03, 10, 13 | `screenshots/CH-01-01-tela-vazia.png` | subtítulo, ajuda do card, tipos só Texto/Imagem, ajuda do atraso ao lado do interruptor e frase do salvo, todos literais |

Contagem: pass 3 · fail 1 · blocked 0 · skip 1

## Achados

### A-1 · [Faixa de avisos › aviso de imagem] o motivo do texto alternativo vazio só aparece depois que as duas artes estão enviadas — a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 4 (subir a arte) · passo 08 do log                        |
| TC                  | TC-FUNC-002                                                           |
| Gravidade proposta  | medium — fricção: ela corrige um motivo e só então descobre o outro; sobe de low por ser a jornada P0 |
| Reproduziu          | intermitente (1 de 1 — não houve segunda tentativa de estado limpo, por orçamento) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-loja`, abrir `http://localhost:8083/admin/faixa-de-avisos`
2. "+ Adicionar aviso", trocar "Tipo do aviso" para Imagem
3. Enviar só `arte-1440x48.png` em "Enviar arte · 1440 × 48"; deixar o texto alternativo vazio

**Esperado:** a recusa traz os dois motivos — falta a arte do celular e "Descreva a arte: é o que o leitor de tela e o Google leem." — **fonte:** TC-FUNC-002, passo 2 (spec H-19)

**Observado:** um alerta só, "4º aviso: envie a arte do celular."; o motivo do texto alternativo aparece só depois de enviar a segunda arte ("4º aviso: Descreva a arte: é o que o leitor de tela e o Google leem."). O Salvar fica desabilitado nos dois momentos, então nada de errado é gravado.

**Evidência:**

- `screenshots/CH-01-08-imagem-sem-celular.png` — a arte do computador enviada, um motivo só
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O aviso recém-adicionado já nasce com o alerta "1º aviso: escreva o trecho em destaque ou o texto…" e a barra "Corrija o que está marcado para salvar.", antes de a dona digitar qualquer coisa | 03 | polimento |
| A prévia "Computador" simula 1024 × 768, não a largura de computador da persona (1440) | 12 | polimento |

## Fora da cobertura

- TC-FUNC-005 inteiro (descer/subir, "5 de 5" e o "+ Adicionar aviso" sumindo e voltando, reordenar só pelo teclado, arrastar) — orçamento
- Sair da tela com alteração não salva (variação do TC-FUNC-001) — orçamento
- Trocar o tipo de Imagem para Texto com as artes enviadas (variação do TC-FUNC-002) — orçamento
- Prévia do A4 (imagem) no Computador; a faixa não girar sozinha em 10 s; editar o A3 e ver a prévia mudar — orçamento
- Miniatura do A4 depois do F5 (o aviso fica fechado na lista e não foi aberto) — orçamento
- Segunda reprodução do A-1 de estado limpo — orçamento

## Debrief

- **Surpresas:** a gravação, o F5 e a loja bateram na primeira tentativa; a loja local mostrou a faixa de imediato, sem o atraso de uma hora
- **Próximo charter:** uma sessão curta para TC-FUNC-005 (reordenar, 5 de 5, teclado) e as variações não tentadas (sair sem salvar, Imagem→Texto) sobre a massa já gravada — devolvendo a ordem do manifesto ao fim
- **Padrão novo:** nada
